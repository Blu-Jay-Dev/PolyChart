import type { Trade, OHLCBar, TimeFrame, } from "@/lib/polymarket/types";
import { TIMEFRAME_MS } from "@/lib/polymarket/types";

/**
 * Constructs OHLC bars from raw trade data.
 * Trades must have price (string), size (string), match_time (string ISO).
 */
export function buildOHLC(trades: Trade[], timeframe: TimeFrame): OHLCBar[] {
  const intervalMs = TIMEFRAME_MS[timeframe];
  const buckets = new Map<number, Trade[]>();

  for (const t of trades) {
    const ts = new Date(t.match_time).getTime();
    const bucket = Math.floor(ts / intervalMs) * intervalMs;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(t);
  }

  return Array.from(buckets.entries())
    .map(([bucketMs, bucketTrades]) => {
      const prices = bucketTrades.map((t) => parseFloat(t.price));
      const sizes = bucketTrades.map((t) => parseFloat(t.size));
      return {
        time: bucketMs / 1000, // lightweight-charts expects seconds
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: sizes.reduce((s, v) => s + v, 0),
      };
    })
    .sort((a, b) => a.time - b.time);
}

/**
 * Merge newly fetched OHLC into an existing sorted array.
 * Replaces any bar with the same time, appends new bars.
 */
export function mergeOHLC(existing: OHLCBar[], incoming: OHLCBar[]): OHLCBar[] {
  const map = new Map(existing.map((b) => [b.time, b]));
  for (const bar of incoming) {
    map.set(bar.time, bar);
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/**
 * Compute Simple Moving Average overlays from OHLC bars.
 */
export function computeSMA(
  bars: OHLCBar[],
  period: number
): Array<{ time: number; value: number }> {
  const result: Array<{ time: number; value: number }> = [];
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, b) => s + b.close, 0) / period;
    result.push({ time: bars[i].time, value: avg });
  }
  return result;
}
