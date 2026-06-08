import { NextRequest, NextResponse } from "next/server";
import { getClosedMarkets, resolvedOutcomeLabel } from "@/lib/polymarket/gamma";
import { cacheGet, cacheSet } from "@/lib/redis";

const CLOB_BASE = "https://clob.polymarket.com";

export interface CalibrationBucket {
  bucket: string;       // "0-10%", "10-20%", etc.
  midpoint: number;     // 0.05, 0.15, …
  count: number;        // sample size
  actualRate: number;   // fraction that resolved YES
  impliedRate: number;  // midpoint of bucket
  edge: number;         // actualRate - impliedRate
}

export interface CalibrationData {
  buckets: CalibrationBucket[];
  totalMarkets: number;
  overallAccuracy: number; // Brier score (lower is better)
  category?: string;
}

async function fetchLastPriceBeforeResolution(
  tokenId: string,
  endDate: string
): Promise<number | null> {
  try {
    // Fetch ~2 weeks of hourly data; take the price nearest to endDate - 24h
    const url = `${CLOB_BASE}/prices-history?market=${tokenId}&interval=1w&fidelity=60`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const history: { t: number; p: number }[] = data.history ?? [];
    if (history.length === 0) return null;

    const endTs = new Date(endDate).getTime() / 1000;
    const cutoff = endTs - 24 * 3600; // price 1 day before resolution

    // Find the last point at or before cutoff
    const sorted = [...history].sort((a, b) => a.t - b.t);
    let best = sorted[0];
    for (const pt of sorted) {
      if (pt.t <= cutoff) best = pt;
      else break;
    }
    return best?.p ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const cacheKey = `calibration:v2:${category ?? "all"}`;

  const cached = await cacheGet<CalibrationData>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const markets = await getClosedMarkets({
    limit: 60,
    category,
    volumeMin: 5000,
  });

  // Bucket edges: 0-10, 10-20, ..., 90-100
  const bucketCount = 10;
  const buckets: { yes: number; total: number }[] = Array.from(
    { length: bucketCount },
    () => ({ yes: 0, total: 0 })
  );

  let brierSum = 0;
  let brierCount = 0;

  await Promise.all(
    markets.map(async (m) => {
      const winLabel = resolvedOutcomeLabel(m);
      if (!winLabel) return;

      // Get YES token id
      let yesTokenId: string | null = null;
      try {
        const ids: string[] = JSON.parse(m.clobTokenIds ?? "[]");
        const outcomes: string[] = JSON.parse(m.outcomes ?? "[]");
        const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
        yesTokenId = ids[yesIdx >= 0 ? yesIdx : 0] ?? null;
      } catch { return; }

      if (!yesTokenId) return;

      const prePrice = await fetchLastPriceBeforeResolution(yesTokenId, m.endDate);
      if (prePrice == null || prePrice < 0 || prePrice > 1) return;

      const yesWon = winLabel.toLowerCase() === "yes" ? 1 : 0;
      const bucketIdx = Math.min(Math.floor(prePrice * bucketCount), bucketCount - 1);
      buckets[bucketIdx].yes += yesWon;
      buckets[bucketIdx].total += 1;

      brierSum += Math.pow(prePrice - yesWon, 2);
      brierCount++;
    })
  );

  const LABELS = [
    "0-10%","10-20%","20-30%","30-40%","40-50%",
    "50-60%","60-70%","70-80%","80-90%","90-100%",
  ];

  const result: CalibrationData = {
    buckets: buckets.map((b, i) => ({
      bucket: LABELS[i],
      midpoint: (i + 0.5) / bucketCount,
      count: b.total,
      actualRate: b.total > 0 ? b.yes / b.total : (i + 0.5) / bucketCount,
      impliedRate: (i + 0.5) / bucketCount,
      edge: b.total > 0 ? b.yes / b.total - (i + 0.5) / bucketCount : 0,
    })),
    totalMarkets: brierCount,
    overallAccuracy: brierCount > 0 ? brierSum / brierCount : 0,
    category,
  };

  await cacheSet(cacheKey, result, 1800); // cache 30 min
  return NextResponse.json(result);
}
