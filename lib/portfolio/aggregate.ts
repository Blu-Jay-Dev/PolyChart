import type { UserPosition, PortfolioSummary } from "@/lib/polymarket/types";

interface RawPosition {
  market: string;
  asset: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  category?: string;
}

export function aggregatePortfolio(positions: RawPosition[]): PortfolioSummary {
  const userPositions: UserPosition[] = positions.map((p) => {
    const costBasis = p.size * p.avgPrice;
    const currentValue = p.size * p.currentPrice;
    const unrealizedPnl = currentValue - costBasis;
    const maxPayout = p.size * 1; // YES token pays out $1 at resolution
    const impliedReturn = costBasis > 0 ? (maxPayout - costBasis) / costBasis : 0;

    return {
      market: p.market,
      asset: p.asset,
      outcome: p.outcome,
      size: p.size,
      avgPrice: p.avgPrice,
      currentPrice: p.currentPrice,
      unrealizedPnl,
      costBasis,
      maxPayout,
      impliedReturn,
    };
  });

  const totalUnrealizedPnl = userPositions.reduce(
    (s, p) => s + p.unrealizedPnl,
    0
  );
  const totalCostBasis = userPositions.reduce((s, p) => s + p.costBasis, 0);
  const totalMaxPayout = userPositions.reduce((s, p) => s + p.maxPayout, 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  positions.forEach((p, i) => {
    const cat = p.category ?? "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + userPositions[i].costBasis;
  });

  return {
    totalUnrealizedPnl,
    totalCostBasis,
    totalMaxPayout,
    positions: userPositions,
    byCategory,
  };
}
