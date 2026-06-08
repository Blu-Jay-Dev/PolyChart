import { NextRequest, NextResponse } from "next/server";
import type { TimeFrame, OHLCBar } from "@/lib/polymarket/types";

const CLOB_BASE     = "https://clob.polymarket.com";
const GAMMA_BASE    = "https://gamma-api.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";

// Map timeframes to CLOB prices-history parameters
const TF_PARAMS: Record<TimeFrame, { interval: string; fidelity: number }> = {
  "1H":  { interval: "1w",  fidelity: 60   },
  "4H":  { interval: "1w",  fidelity: 240  },
  "1D":  { interval: "max", fidelity: 1440 },
  "1W":  { interval: "max", fidelity: 1440 },
};

// Bar duration in seconds per timeframe
const TF_INTERVAL_S: Record<TimeFrame, number> = {
  "1H":  3_600,
  "4H":  14_400,
  "1D":  86_400,
  "1W":  7 * 86_400,
};

interface PricePoint { t: number; p: number; }

// data-api trade shape
interface DataApiTrade {
  asset:       string;
  conditionId: string;
  size:        number;   // already a number (USDC)
  price:       number;
  timestamp:   number;   // unix seconds
  side:        "BUY" | "SELL";
  outcome:     string;
}

// ─── Price history ────────────────────────────────────────────────────────────

async function fetchPriceHistory(tokenId: string, tf: TimeFrame): Promise<PricePoint[]> {
  const { interval, fidelity } = TF_PARAMS[tf];
  const url = `${CLOB_BASE}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 30 } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
}

// ─── Condition ID lookup (needed to query data-api trades) ───────────────────

async function fetchConditionId(tokenId: string): Promise<string | null> {
  const url = `${GAMMA_BASE}/markets?clobTokenIds=${tokenId}&limit=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
    if (!res.ok) return null;
    const markets = await res.json();
    return markets?.[0]?.conditionId ?? null;
  } catch {
    return null;
  }
}

// ─── Trade volume from public data-api ───────────────────────────────────────

async function fetchAllTrades(conditionId: string): Promise<DataApiTrade[]> {
  const all: DataApiTrade[] = [];
  let offset = 0;
  const LIMIT = 500;

  for (let page = 0; page < 40; page++) {
    const url = `${DATA_API_BASE}/trades?market=${conditionId}&limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) break;

    const trades: DataApiTrade[] = await res.json();
    if (!Array.isArray(trades) || trades.length === 0) break;

    all.push(...trades);
    if (trades.length < LIMIT) break; // last page
    offset += LIMIT;
  }

  return all;
}

// ─── OHLC construction ────────────────────────────────────────────────────────

function toOHLC(points: PricePoint[]): OHLCBar[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.t - b.t);
  return sorted.map((pt, i) => {
    const open  = i === 0 ? pt.p : sorted[i - 1].p;
    const close = pt.p;
    return { time: pt.t, open, close, high: Math.max(open, close), low: Math.min(open, close), volume: 0 };
  });
}

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
      time: t, open: bars[0].open,
      high: Math.max(...bars.map((b) => b.high)),
      low:  Math.min(...bars.map((b) => b.low)),
      close: bars[bars.length - 1].close, volume: 0,
    }))
    .sort((a, b) => a.time - b.time);
}

function applyVolume(bars: OHLCBar[], trades: DataApiTrade[], intervalS: number): void {
  if (trades.length === 0) return;
  const volumeMap = new Map<number, number>();
  for (const t of trades) {
    const bucket = Math.floor(t.timestamp / intervalS) * intervalS;
    volumeMap.set(bucket, (volumeMap.get(bucket) ?? 0) + t.size);
  }
  for (const bar of bars) {
    const bucket = Math.floor(bar.time / intervalS) * intervalS;
    bar.volume = volumeMap.get(bucket) ?? 0;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tf = (req.nextUrl.searchParams.get("tf") ?? "1D") as TimeFrame;

  try {
    // Fetch price history and condition ID concurrently
    const [points, conditionId] = await Promise.all([
      fetchPriceHistory(id, tf),
      fetchConditionId(id),
    ]);

    if (points.length === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" },
      });
    }

    const daily = toOHLC(points);
    const bars  = tf === "1W" ? toWeeklyOHLC(daily) : daily;

    // Fetch trades for volume (public endpoint, no auth needed)
    if (conditionId) {
      const trades = await fetchAllTrades(conditionId);
      applyVolume(bars, trades, TF_INTERVAL_S[tf]);
    }

    return NextResponse.json(bars, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("[/api/ohlc]", err);
    return NextResponse.json([], { status: 200 });
  }
}
