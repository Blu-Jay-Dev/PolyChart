import { NextResponse } from "next/server";
import { getClosedMarkets, resolvedOutcomeLabel } from "@/lib/polymarket/gamma";
import { cacheGet, cacheSet } from "@/lib/redis";

const DATA_API = "https://data-api.polymarket.com";

interface RawTrade {
  proxyWallet: string;
  pseudonym: string;
  side: "BUY" | "SELL";
  outcome: string;
  size: number;
  price: number;
  timestamp: number;
  conditionId: string;
  title: string;
}

export interface WalletStat {
  address: string;
  pseudonym: string;
  totalPnl: number;
  totalStaked: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  tradeCount: number;
  avgStakePerMarket: number;
  topMarket: string;
}

async function fetchTrades(conditionId: string, limit = 500): Promise<RawTrade[]> {
  try {
    const url = `${DATA_API}/trades?market=${conditionId}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const cacheKey = "smart-money:leaderboard:v2";
  const cached = await cacheGet<WalletStat[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Fetch top recently-resolved markets across categories
  const closedMarkets = await getClosedMarkets({ limit: 20, volumeMin: 10000 });

  // Per-wallet stats
  const walletMap = new Map<
    string,
    {
      pseudonym: string;
      pnl: number;
      staked: number;
      wins: number;
      losses: number;
      trades: number;
      marketSet: Set<string>;
      bestMarket: { title: string; pnl: number };
    }
  >();

  await Promise.all(
    closedMarkets.map(async (market) => {
      const winLabel = resolvedOutcomeLabel(market);
      if (!winLabel) return;

      // Get conditionId
      let conditionId = (market as unknown as { conditionId?: string }).conditionId;
      if (!conditionId) return;

      const trades = await fetchTrades(conditionId);

      for (const t of trades) {
        if (!t.proxyWallet || t.side !== "BUY") continue;

        const won = t.outcome?.toLowerCase() === winLabel.toLowerCase();
        // P&L for a buy: winner → net gain = size*(1-price), loser → net loss = size*price
        const pnl = won ? t.size * (1 - t.price) : -(t.size * t.price);
        const staked = t.size * t.price;

        const existing = walletMap.get(t.proxyWallet);
        if (!existing) {
          walletMap.set(t.proxyWallet, {
            pseudonym: t.pseudonym || t.proxyWallet.slice(0, 8),
            pnl,
            staked,
            wins: won ? 1 : 0,
            losses: won ? 0 : 1,
            trades: 1,
            marketSet: new Set([conditionId]),
            bestMarket: { title: market.question, pnl },
          });
        } else {
          existing.pnl += pnl;
          existing.staked += staked;
          if (won) existing.wins++; else existing.losses++;
          existing.trades++;
          existing.marketSet.add(conditionId);
          if (pnl > existing.bestMarket.pnl) {
            existing.bestMarket = { title: market.question, pnl };
          }
        }
      }
    })
  );

  const leaderboard: WalletStat[] = Array.from(walletMap.entries())
    .filter(([, v]) => v.trades >= 3) // filter noise
    .map(([address, v]) => ({
      address,
      pseudonym: v.pseudonym,
      totalPnl: Math.round(v.pnl * 100) / 100,
      totalStaked: Math.round(v.staked * 100) / 100,
      winCount: v.wins,
      lossCount: v.losses,
      winRate: v.wins / (v.wins + v.losses),
      tradeCount: v.trades,
      avgStakePerMarket: Math.round((v.staked / v.marketSet.size) * 100) / 100,
      topMarket: v.bestMarket.title,
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, 50);

  await cacheSet(cacheKey, leaderboard, 600); // cache 10 min
  return NextResponse.json(leaderboard);
}
