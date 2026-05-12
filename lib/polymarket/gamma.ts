import { cacheGet, cacheSet } from "@/lib/redis";
import type { Market, Event } from "./types";

const BASE_URL =
  process.env.POLYMARKET_GAMMA_BASE_URL || "https://gamma-api.polymarket.com";

async function gammaFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  ttlSeconds = 60
): Promise<T> {
  const cacheKey = `gamma:${path}:${JSON.stringify(params ?? {})}`;
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
    throw new Error(`Gamma API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  await cacheSet(cacheKey, data, ttlSeconds);
  return data;
}

export async function getMarkets(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  category?: string;
  order?: string;
  volumeMin?: number;
}): Promise<Market[]> {
  return gammaFetch<Market[]>("/markets", {
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
    ...(params?.active !== undefined ? { active: params.active } : {}),
    ...(params?.closed !== undefined ? { closed: params.closed } : {}),
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.order ? { order: params.order } : {}),
    // Filter out zero-volume resolved markets; default 1000 USD
    volume_num_min: params?.volumeMin ?? 1000,
  });
}

export async function getMarket(marketId: string): Promise<Market> {
  return gammaFetch<Market>(`/markets/${marketId}`, {}, 60);
}

export async function getEvents(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  category?: string;
}): Promise<Event[]> {
  return gammaFetch<Event[]>("/events", {
    limit: params?.limit ?? 50,
    offset: params?.offset ?? 0,
    ...(params?.active !== undefined ? { active: params.active } : {}),
    ...(params?.category ? { category: params.category } : {}),
  });
}

export async function searchMarkets(query: string): Promise<Market[]> {
  return gammaFetch<Market[]>("/markets", { q: query, limit: 50 }, 30);
}
