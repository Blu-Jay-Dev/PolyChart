import { NextRequest, NextResponse } from "next/server";
import type { TimeFrame, OHLCBar } from "@/lib/polymarket/types";

const CLOB_BASE = "https://clob.polymarket.com";

// Map our timeframes to CLOB prices-history parameters
const TF_PARAMS: Record<TimeFrame, { interval: string; fidelity: number }> = {
  "1H":  { interval: "1w",  fidelity: 60   }, // 1 week of hourly data
  "4H":  { interval: "1w",  fidelity: 240  }, // 1 week of 4-hour data
  "1D":  { interval: "max", fidelity: 1440 }, // All-time daily data
  "1W":  { interval: "max", fidelity: 1440 }, // All-time daily (client groups to weekly)
};

interface PricePoint {
  t: number; // unix seconds
  p: number; // price (0–1)
}

async function fetchPriceHistory(tokenId: string, tf: TimeFrame): Promise<PricePoint[]> {
  const { interval, fidelity } = TF_PARAMS[tf];
  const url = `${CLOB_BASE}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    next: { revalidate: 30 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
}

/**
 * Convert a price-history series into OHLC bars.
 * Each bar's open = previous bar's close; high/low derived from open↔close range.
 */
function toOHLC(points: PricePoint[]): OHLCBar[] {
  if (points.length === 0) return [];

  // Sort ascending by time (should already be, but be safe)
  const sorted = [...points].sort((a, b) => a.t - b.t);

  return sorted.map((pt, i) => {
    const open  = i === 0 ? pt.p : sorted[i - 1].p;
    const close = pt.p;
    return {
      time:   pt.t,                    // already in unix seconds
      open,
      close,
      high:   Math.max(open, close),
      low:    Math.min(open, close),
      volume: 0,
    };
  });
}

/**
 * For 1W view, bucket daily bars into weekly bars.
 */
function toWeeklyOHLC(daily: OHLCBar[]): OHLCBar[] {
  const WEEK_S = 7 * 24 * 3600;
  const buckets = new Map<number, OHLCBar[]>();

  for (const bar of daily) {
    const bucket = Math.floor(bar.time / WEEK_S) * WEEK_S;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(bar);
  }

  return Array.from(buckets.entries())
    .map(([t, bars]) => ({
      time:   t,
      open:   bars[0].open,
      high:   Math.max(...bars.map((b) => b.high)),
      low:    Math.min(...bars.map((b) => b.low)),
      close:  bars[bars.length - 1].close,
      volume: 0,
    }))
    .sort((a, b) => a.time - b.time);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tf = ((req.nextUrl.searchParams.get("tf") ?? "1D") as TimeFrame);

  try {
    const points = await fetchPriceHistory(id, tf);

    if (points.length === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" },
      });
    }

    const daily = toOHLC(points);
    const bars  = tf === "1W" ? toWeeklyOHLC(daily) : daily;

    return NextResponse.json(bars, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("[/api/ohlc]", err);
    return NextResponse.json([], { status: 200 });
  }
}
