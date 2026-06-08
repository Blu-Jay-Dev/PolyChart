import type { Trade, OHLCBar, TimeFrame } from "@/lib/polymarket/types";
import { TIMEFRAME_MS } from "@/lib/polymarket/types";

type TimedValue = { time: number; value: number };

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
        time: bucketMs / 1000,
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
 */
export function mergeOHLC(existing: OHLCBar[], incoming: OHLCBar[]): OHLCBar[] {
  const map = new Map(existing.map((b) => [b.time, b]));
  for (const bar of incoming) map.set(bar.time, bar);
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

// ─── Moving averages ──────────────────────────────────────────────────────────

export function computeSMA(bars: OHLCBar[], period: number): TimedValue[] {
  const result: TimedValue[] = [];
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, b) => s + b.close, 0) / period;
    result.push({ time: bars[i].time, value: avg });
  }
  return result;
}

export function computeEMA(bars: OHLCBar[], period: number): TimedValue[] {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  const result: TimedValue[] = [];

  // Seed with SMA of the first `period` bars
  const seed = bars.slice(0, period).reduce((s, b) => s + b.close, 0) / period;
  result.push({ time: bars[period - 1].time, value: seed });

  for (let i = period; i < bars.length; i++) {
    const prev = result[result.length - 1].value;
    const ema = bars[i].close * k + prev * (1 - k);
    result.push({ time: bars[i].time, value: ema });
  }
  return result;
}

// ─── Bollinger Bands ─────────────────────────────────────────────────────────

export interface BollingerBands {
  upper: TimedValue[];
  middle: TimedValue[];
  lower: TimedValue[];
}

export function computeBollingerBands(
  bars: OHLCBar[],
  period = 20,
  mult = 2
): BollingerBands {
  const upper: TimedValue[] = [];
  const middle: TimedValue[] = [];
  const lower: TimedValue[] = [];

  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, b) => s + b.close, 0) / period;
    const variance = slice.reduce((s, b) => s + (b.close - avg) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    const t = bars[i].time;
    upper.push({ time: t, value: avg + mult * sd });
    middle.push({ time: t, value: avg });
    lower.push({ time: t, value: avg - mult * sd });
  }
  return { upper, middle, lower };
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

export function computeRSI(bars: OHLCBar[], period = 14): TimedValue[] {
  if (bars.length < period + 1) return [];
  const result: TimedValue[] = [];

  // Seed: simple average gains/losses over the first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRSI = (g: number, l: number) =>
    l === 0 ? 100 : 100 - 100 / (1 + g / l);

  result.push({ time: bars[period].time, value: toRSI(avgGain, avgLoss) });

  // Wilder's smoothed moving average for subsequent bars
  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: bars[i].time, value: toRSI(avgGain, avgLoss) });
  }
  return result;
}
