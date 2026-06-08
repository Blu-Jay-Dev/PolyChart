import { NextRequest, NextResponse } from "next/server";
import type { TimeFrame, OHLCBar } from "@/lib/polymarket/types";
import { HAS_CLOB_AUTH, buildClobHeaders } from "@/lib/polymarket/clob-auth";

const CLOB_BASE = "https://clob.polymarket.com";

// Map our timeframes to CLOB prices-history parameters
const TF_PARAMS: Record<TimeFrame, { interval: string; fidelity: number }> = {
  "1H":  { interval: "1w",  fidelity: 60   }, // 1 week of hourly data
  "4H":  { interval: "1w",  fidelity: 240  }, // 1 week of 4-hour data
  "1D":  { interval: "max", fidelity: 1440 }, // All-time daily data
  "1W":  { interval: "max", fidelity: 1440 }, // All-time daily (client groups to weekly)
};

// Bar duration in seconds per timeframe (used to bucket trades)
const TF_INTERVAL_S: Record<TimeFrame, number> = {
  "1H":  3_600,
  "4H":  14_400,
  "1D":  86_400,
  "1W":  7 * 86_400,
};

interface PricePoint {
  t: number; // unix seconds
  p: number; // price (0–1)
}

interface TradeRecord {
  match_time: string; // ISO timestamp
  size: string;       // USDC notional
}

interface TradesPage {
  data: TradeRecord[];
  count: number;
  limit: number;
  next_cursor: string;
}

const END_CURSOR = "LTE="; // base64("-1") signals last page

// ─── Price history ────────────────────────────────────────────────────────────

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

// ─── Trades (authenticated) ───────────────────────────────────────────────────

async function fetchAllTrades(assetId: string, afterTs: number): Promise<TradeRecord[]> {
  if (!HAS_CLOB_AUTH) return [];

  const all: TradeRecord[] = [];
  let cursor = "";

  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({
      asset_id: assetId,
      after:    String(afterTs),
      limit:    "500",
    });
    if (cursor) qs.set("next_cursor", cursor);

    const path = `/data/trades?${qs.toString()}`;
    const res  = await fetch(`${CLOB_BASE}${path}`, {
      headers: buildClobHeaders("GET", path),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn("[/api/ohlc] trades fetch failed:", res.status);
      break;
    }

    const json: TradesPage = await res.json();
    const page_trades = Array.isArray(json.data) ? json.data : [];
    all.push(...page_trades);

    if (!json.next_cursor || json.next_cursor === END_CURSOR || page_trades.length < 500) break;
    cursor = json.next_cursor;
  }

  return all;
}

// ─── OHLC construction ────────────────────────────────────────────────────────

/**
 * Convert a price-history series into OHLC bars.
 * Each bar's open = previous bar's close; high/low derived from open↔close range.
 */
function toOHLC(points: PricePoint[]): OHLCBar[] {
  if (points.length === 0) return [];

  const sorted = [...points].sort((a, b) => a.t - b.t);

  return sorted.map((pt, i) => {
    const open  = i === 0 ? pt.p : sorted[i - 1].p;
    const close = pt.p;
    return {
      time:   pt.t,
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

/**
 * Merge trade volume into OHLC bars by bucketing each trade into the bar
 * whose interval contains the trade's match_time.
 */
function applyVolume(bars: OHLCBar[], trades: TradeRecord[], intervalS: number): void {
  if (trades.length === 0) return;

  const volumeMap = new Map<number, number>();

  for (const t of trades) {
    const ts     = Math.floor(new Date(t.match_time).getTime() / 1000);
    const bucket = Math.floor(ts / intervalS) * intervalS;
    volumeMap.set(bucket, (volumeMap.get(bucket) ?? 0) + parseFloat(t.size));
  }

  for (const bar of bars) {
    const bucket = Math.floor(bar.time / intervalS) * intervalS;
    bar.volume   = volumeMap.get(bucket) ?? 0;
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
    // Fetch price history and trades concurrently
    const [points, trades] = await Promise.all([
      fetchPriceHistory(id, tf),
      fetchAllTrades(id, 0), // 0 = no lower bound; rely on prices-history range
    ]);

    if (points.length === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" },
      });
    }

    const daily = toOHLC(points);
    const bars  = tf === "1W" ? toWeeklyOHLC(daily) : daily;

    // Attach real volume if we fetched trades
    applyVolume(bars, trades, TF_INTERVAL_S[tf]);

    return NextResponse.json(bars, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("[/api/ohlc]", err);
    return NextResponse.json([], { status: 200 });
  }
}
