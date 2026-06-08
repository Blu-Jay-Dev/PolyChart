import { NextRequest, NextResponse } from "next/server";
import type { TimeFrame } from "@/lib/polymarket/types";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const DATA_API   = "https://data-api.polymarket.com";

const TF_INTERVAL_S: Record<TimeFrame, number> = {
  "1H":  3_600,
  "4H":  14_400,
  "1D":  86_400,
  "1W":  7 * 86_400,
};

interface RawTrade {
  side: "BUY" | "SELL";
  size: number;
  timestamp: number;
}

export interface DeltaBar {
  time: number;   // unix seconds, bucket start
  delta: number;  // net buy - sell for this bar
  cumDelta: number; // running cumulative delta
}

async function getConditionId(tokenId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GAMMA_BASE}/markets?clobTokenIds=${tokenId}&limit=1`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.conditionId ?? null;
  } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tf = (req.nextUrl.searchParams.get("tf") ?? "1D") as TimeFrame;
  const intervalS = TF_INTERVAL_S[tf];

  const conditionId = await getConditionId(id);
  if (!conditionId) return NextResponse.json([]);

  // Fetch up to 4 pages of trades
  const trades: RawTrade[] = [];
  const LIMIT = 500;
  for (let page = 0; page < 4; page++) {
    try {
      const res = await fetch(
        `${DATA_API}/trades?market=${conditionId}&limit=${LIMIT}&offset=${page * LIMIT}`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;
      trades.push(...data);
      if (data.length < LIMIT) break;
    } catch { break; }
  }

  if (trades.length === 0) return NextResponse.json([]);

  // Bucket by interval
  const bucketMap = new Map<number, number>();
  for (const t of trades) {
    const bucket = Math.floor(t.timestamp / intervalS) * intervalS;
    const delta = t.side === "BUY" ? t.size : -t.size;
    bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + delta);
  }

  const sorted = Array.from(bucketMap.entries()).sort((a, b) => a[0] - b[0]);

  let cum = 0;
  const bars: DeltaBar[] = sorted.map(([time, delta]) => {
    cum += delta;
    return { time, delta, cumDelta: cum };
  });

  return NextResponse.json(bars, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
