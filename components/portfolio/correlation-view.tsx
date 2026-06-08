"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { UserPosition } from "@/lib/polymarket/types";

// Simple keyword-based theme clustering
const THEME_PATTERNS: Array<{ label: string; keywords: string[] }> = [
  { label: "US Politics",  keywords: ["president","trump","biden","harris","democrat","republican","senate","congress","election","vote","white house"] },
  { label: "Crypto",       keywords: ["bitcoin","ethereum","btc","eth","crypto","solana","defi","nft","blockchain","coinbase","binance"] },
  { label: "Geopolitics",  keywords: ["war","military","russia","ukraine","china","iran","nato","israel","gaza","ceasefire","sanction"] },
  { label: "Economics",    keywords: ["fed","rate","inflation","gdp","recession","interest","monetary","fiscal","unemployment","job"] },
  { label: "Sports",       keywords: ["nba","nfl","mlb","nhl","soccer","football","basketball","baseball","championship","superbowl","world cup"] },
  { label: "Tech",         keywords: ["ai","openai","google","apple","microsoft","amazon","ipo","startup","merger"] },
];

function detectTheme(title: string): string {
  const lower = title.toLowerCase();
  for (const theme of THEME_PATTERNS) {
    if (theme.keywords.some((kw) => lower.includes(kw))) return theme.label;
  }
  return "Other";
}

interface ClusterGroup {
  theme: string;
  positions: UserPosition[];
  totalCost: number;
  totalPnl: number;
}

interface Props {
  positions: UserPosition[];
}

export function CorrelationView({ positions }: Props) {
  const clusters = useMemo<ClusterGroup[]>(() => {
    const map = new Map<string, ClusterGroup>();
    for (const pos of positions) {
      const theme = detectTheme(pos.market);
      if (!map.has(theme)) {
        map.set(theme, { theme, positions: [], totalCost: 0, totalPnl: 0 });
      }
      const g = map.get(theme)!;
      g.positions.push(pos);
      g.totalCost += pos.costBasis;
      g.totalPnl  += pos.unrealizedPnl;
    }
    return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost);
  }, [positions]);

  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
  const independentBets = clusters.length;
  const concentration = clusters.length > 0
    ? (clusters[0].totalCost / Math.max(totalCost, 1)) * 100
    : 0;

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle>Concentration Analysis</CardTitle>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span><span className="text-slate-300 font-medium">{independentBets}</span> independent themes</span>
          <span>Top theme: <span className={cn("font-medium", concentration > 60 ? "text-red-400" : concentration > 40 ? "text-yellow-400" : "text-green-400")}>
            {concentration.toFixed(0)}%
          </span></span>
        </div>
      </CardHeader>

      <div className="space-y-2">
        {clusters.map((g) => {
          const pct = totalCost > 0 ? (g.totalCost / totalCost) * 100 : 0;
          return (
            <div key={g.theme}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">{g.theme}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{g.positions.length} position{g.positions.length !== 1 ? "s" : ""}</span>
                  <span className="font-data text-slate-400">{formatUSD(g.totalCost)}</span>
                  <span className={cn("font-data", g.totalPnl >= 0 ? "text-green-400" : "text-red-400")}>
                    {g.totalPnl >= 0 ? "+" : ""}{formatUSD(g.totalPnl)}
                  </span>
                  <span className="font-data text-slate-500 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-[#1c2030] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    pct > 60 ? "bg-red-500" : pct > 40 ? "bg-yellow-500" : "bg-blue-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {g.positions.slice(0, 3).map((p, i) => (
                  <span key={i} className="text-[10px] text-slate-600 bg-[#1c2030] rounded px-1.5 py-0.5 truncate max-w-[160px]">
                    {p.outcome} · {p.market.slice(0, 30)}{p.market.length > 30 ? "…" : ""}
                  </span>
                ))}
                {g.positions.length > 3 && (
                  <span className="text-[10px] text-slate-700">+{g.positions.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {concentration > 60 && (
        <div className="mt-3 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
          High concentration: {clusters[0]?.theme} makes up {concentration.toFixed(0)}% of your exposure. Consider diversifying.
        </div>
      )}
    </Card>
  );
}
