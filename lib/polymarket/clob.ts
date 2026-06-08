import { cacheGet, cacheSet } from "@/lib/redis";
import type { OrderBook, Trade, SpreadInfo } from "./types";

const BASE_URL =
  process.env.POLYMARKET_CLOB_BASE_URL || "https://clob.polymarket.com";

async function clobFetch<T>(
  path: string,
  params?: Record<string, string | number>,
  ttlSeconds = 5
): Promise<T> {
  const cacheKey = `clob:${path}:${JSON.stringify(params ?? {})}`;
  const cached = await cacheGet<T>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`CLOB API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  await cacheSet(cacheKey, data, ttlSeconds);
  return data;
}

export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  return clobFetch<OrderBook>("/book", { token_id: tokenId }, 5);
}

export async function getTrades(params: {
  tokenId: string;
  limit?: number;
  before?: number;
}): Promise<Trade[]> {
  const result = await clobFetch<{ data: Trade[]; count: number; limit: number; offset: number }>(
    "/trades",
    {
      token_id: params.tokenId,
      limit: params.limit ?? 1000,
      ...(params.before ? { before: params.before } : {}),
    },
    30
  );
  // The CLOB API returns {data, count, limit, offset}
  return result.data ?? (result as unknown as Trade[]);
}

export function computeSpread(book: OrderBook): SpreadInfo {
  // CLOB returns bids ascending (lowest first) and asks descending (highest first)
  // Best bid = max price in bids, best ask = min price in asks
  const bidPrices = book?.bids?.map((l) => parseFloat(l.price)) ?? [];
  const askPrices = book?.asks?.map((l) => parseFloat(l.price)) ?? [];
  const topBid = bidPrices.length > 0 ? Math.max(...bidPrices) : 0;
  const topAsk = askPrices.length > 0 ? Math.min(...askPrices) : 1;
  return {
    bid: topBid,
    ask: topAsk,
    spread: topAsk - topBid,
    mid: (topBid + topAsk) / 2,
  };
}

export async function getSpread(tokenId: string): Promise<SpreadInfo> {
  const book = await getOrderBook(tokenId);
  return computeSpread(book);
}
