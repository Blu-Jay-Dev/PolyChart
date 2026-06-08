import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/polymarket/gamma";
import { cacheGet, cacheSet } from "@/lib/redis";

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const MANIFOLD_BASE = "https://manifold.markets/api/v0";

export interface ArbitrageOpportunity {
  polyQuestion: string;
  polyTokenId: string;
  polyPrice: number;       // YES probability on Polymarket
  polyVolume: number;
  kalshiTitle?: string;
  kalshiTicker?: string;
  kalshiPrice?: number;    // YES probability on Kalshi
  manifoldQuestion?: string;
  manifoldSlug?: string;
  manifoldPrice?: number;  // probability on Manifold
  maxSpread: number;       // largest probability divergence across platforms
  platforms: string[];     // which platforms cover this topic
}

interface KalshiMarket {
  ticker: string;
  title: string;
  event_ticker: string;
  last_price_dollars: string;
  yes_ask_dollars?: string;
  yes_bid_dollars?: string;
  no_ask_dollars?: string;
  status: string;
  market_type?: string;
}

interface ManifoldMarket {
  id: string;
  question: string;
  slug: string;
  probability: number;
  volume: number;
  isResolved: boolean;
}

async function fetchKalshiMarkets(): Promise<KalshiMarket[]> {
  try {
    const res = await fetch(
      `${KALSHI_BASE}/markets?limit=200&status=open`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.markets ?? []).filter(
      (m: KalshiMarket) => m.market_type === "binary" || !m.market_type
    );
  } catch {
    return [];
  }
}

async function fetchManifoldMarkets(query: string): Promise<ManifoldMarket[]> {
  try {
    const res = await fetch(
      `${MANIFOLD_BASE}/search-markets?term=${encodeURIComponent(query)}&limit=5&filter=open`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter((m: ManifoldMarket) => !m.isResolved) : [];
  } catch {
    return [];
  }
}

/** Tokenize a market title into significant keywords */
function keyTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  "will","the","this","that","than","with","from","have","what","when","which",
  "market","price","above","below","before","after","during","between","over",
  "does","into","more","most","some","such","very","been","they","their","there",
  "next","year","2025","2026","2027","first","last","high","vote","reach","make",
]);

function similarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const intersection = b.filter((w) => setA.has(w)).length;
  if (a.length === 0 || b.length === 0) return 0;
  return intersection / Math.min(a.length, b.length);
}

export async function GET() {
  const cacheKey = "arbitrage:v2";
  const cached = await cacheGet<ArbitrageOpportunity[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Fetch top Polymarket markets
  const [polyMarkets, kalshiMarkets] = await Promise.all([
    getMarkets({ limit: 60, active: true, volumeMin: 5000, order: "volume" }),
    fetchKalshiMarkets(),
  ]);

  const opportunities: ArbitrageOpportunity[] = [];

  for (const pm of polyMarkets) {
    let polyPrice: number;
    let polyTokenId = "";

    try {
      const ids: string[] = JSON.parse(pm.clobTokenIds ?? "[]");
      const outcomes: string[] = JSON.parse(pm.outcomes ?? "[]");
      const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
      polyTokenId = ids[yesIdx >= 0 ? yesIdx : 0] ?? "";
      polyPrice = pm.lastTradePrice ?? (pm.bestBid != null && pm.bestAsk != null
        ? (pm.bestBid + pm.bestAsk) / 2 : 0);
    } catch { continue; }

    if (!polyTokenId || polyPrice <= 0) continue;

    const polyTokens = keyTokens(pm.question);
    const opp: ArbitrageOpportunity = {
      polyQuestion: pm.question,
      polyTokenId,
      polyPrice,
      polyVolume: pm.volume24hr ?? 0,
      maxSpread: 0,
      platforms: ["Polymarket"],
    };

    // Match against Kalshi
    let bestKalshiSim = 0;
    let bestKalshi: KalshiMarket | null = null;
    for (const km of kalshiMarkets) {
      const sim = similarity(polyTokens, keyTokens(km.title));
      if (sim > bestKalshiSim && sim >= 0.3) {
        bestKalshiSim = sim;
        bestKalshi = km;
      }
    }

    if (bestKalshi) {
      // Kalshi prices are in dollars (e.g. "0.6700" = 67% yes probability)
      const rawPrice = bestKalshi.yes_bid_dollars ?? bestKalshi.last_price_dollars ?? "0";
      const kalshiPrice = parseFloat(rawPrice);
      if (kalshiPrice > 0 && kalshiPrice < 1) {
        opp.kalshiTitle = bestKalshi.title;
        opp.kalshiTicker = bestKalshi.ticker;
        opp.kalshiPrice = kalshiPrice;
        opp.platforms.push("Kalshi");
        opp.maxSpread = Math.max(opp.maxSpread, Math.abs(polyPrice - kalshiPrice));
      }
    }

    // Match against Manifold for the top markets (limit API calls)
    if (opp.maxSpread > 0.03 || opportunities.length < 10) {
      const manifoldResults = await fetchManifoldMarkets(
        polyTokens.slice(0, 3).join(" ")
      );
      let bestManifold: ManifoldMarket | null = null;
      let bestMSim = 0;
      for (const mm of manifoldResults) {
        const sim = similarity(polyTokens, keyTokens(mm.question));
        if (sim > bestMSim && sim >= 0.25) {
          bestMSim = sim;
          bestManifold = mm;
        }
      }
      if (bestManifold && bestManifold.probability > 0) {
        opp.manifoldQuestion = bestManifold.question;
        opp.manifoldSlug = bestManifold.slug;
        opp.manifoldPrice = bestManifold.probability;
        opp.platforms.push("Manifold");
        opp.maxSpread = Math.max(opp.maxSpread, Math.abs(polyPrice - bestManifold.probability));
      }
    }

    // Only include markets tracked on 2+ platforms
    if (opp.platforms.length >= 2) {
      opportunities.push(opp);
    }
  }

  // Sort by largest spread (biggest arbitrage opportunity)
  opportunities.sort((a, b) => b.maxSpread - a.maxSpread);

  await cacheSet(cacheKey, opportunities, 300); // cache 5 min
  return NextResponse.json(opportunities);
}
