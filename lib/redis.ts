import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

// Treat placeholder / missing config as "no Redis" — avoids 9-second DNS timeouts
const HAS_REDIS =
  REDIS_URL.length > 0 &&
  !REDIS_URL.includes("placeholder") &&
  REDIS_URL.startsWith("https://");

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!HAS_REDIS) throw new Error("Redis not configured");
  if (!redis) {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!HAS_REDIS) return null;
  try {
    const client = getRedis();
    return await client.get<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!HAS_REDIS) return;
  try {
    const client = getRedis();
    await client.set(key, value, { ex: ttlSeconds });
  } catch {
    // Non-fatal — cache miss on next read
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!HAS_REDIS) return;
  try {
    const client = getRedis();
    await client.del(key);
  } catch {
    // Non-fatal
  }
}
