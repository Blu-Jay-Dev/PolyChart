import type { OrderBook, SlippageResult } from "@/lib/polymarket/types";

/**
 * Estimate slippage for a given trade size (in USD) on a given side.
 * side: "buy" = consume asks, "sell" = consume bids
 */
export function estimateSlippage(
  book: OrderBook,
  tradeSize: number,
  side: "buy" | "sell"
): SlippageResult {
  const levels = side === "buy"
    ? book.asks.map((l) => ({ price: parseFloat(l.price), size: parseFloat(l.size) }))
    : book.bids.map((l) => ({ price: parseFloat(l.price), size: parseFloat(l.size) }));

  if (levels.length === 0) {
    return {
      tradeSize,
      estimatedPrice: side === "buy" ? 1 : 0,
      slippagePct: 100,
      fills: [],
    };
  }

  const midPrice =
    side === "buy"
      ? parseFloat(book.asks[0]?.price ?? "1")
      : parseFloat(book.bids[0]?.price ?? "0");

  let remaining = tradeSize;
  let totalCost = 0;
  const fills: Array<{ price: number; size: number }> = [];

  for (const level of levels) {
    if (remaining <= 0) break;
    const levelCost = level.price * level.size;
    const take = Math.min(remaining, levelCost);
    const contracts = take / level.price;
    fills.push({ price: level.price, size: contracts });
    totalCost += take;
    remaining -= take;
  }

  const estimatedPrice = fills.length > 0
    ? totalCost / fills.reduce((s, f) => s + f.size, 0)
    : midPrice;

  const slippagePct =
    midPrice > 0 ? Math.abs((estimatedPrice - midPrice) / midPrice) * 100 : 0;

  return { tradeSize, estimatedPrice, slippagePct, fills };
}

export const TRADE_SIZES = [100, 500, 1000, 5000];
