"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn, formatPrice, categoryColor } from "@/lib/utils";
import type { Market } from "@/lib/polymarket/types";

interface Props {
  currentQuestion: string;
  category: string;
  currentTokenId: string;
}

export function RelatedMarkets({ currentQuestion, category, currentTokenId }: Props) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [yourProbs, setYourProbs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const words = currentQuestion
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3)
      .join(" ");

    const params = new URLSearchParams({ limit: "8", order: "volume" });
    if (category) params.set("category", category);

    fetch(`/api/markets?${params}`)
      .then((r) => r.json())
      .then((data: Market[]) => {
        if (!Array.isArray(data)) return;
        const filtered = data.filter((m) => {
          try {
            const ids: string[] = JSON.parse(m.clobTokenIds ?? "[]");
            return !ids.includes(currentTokenId);
          } catch { return true; }
        }).slice(0, 6);
        setMarkets(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentQuestion, category, currentTokenId]);

  if (loading || markets.length === 0) return null;

  const getTokenId = (m: Market): string => {
    try {
      const ids: string[] = JSON.parse(m.clobTokenIds ?? "[]");
      return ids[0] ?? m.id;
    } catch { return m.id; }
  };

  const getPrice = (m: Market): number => {
    try {
      const outcomes: string[] = JSON.parse(m.outcomes ?? "[]");
      const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
      if (yesIdx < 0) return m.lastTradePrice ?? 0;
    } catch {}
    return m.lastTradePrice ?? (m.bestBid != null && m.bestAsk != null
      ? (m.bestBid + m.bestAsk) / 2 : 0);
  };

  return (
    <div className="space-y-2">
      {markets.map((m) => {
        const tokenId = getTokenId(m);
        const price = getPrice(m);
        const yourP = yourProbs[m.id];
        const edge = yourP != null ? yourP / 100 - price : null;

        return (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded border border-[#252a38] bg-[#0d0f12] px-3 py-2 hover:border-[#363d52] transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <Link
                href={`/market/${m.id}`}
                className="text-xs text-slate-300 hover:text-blue-400 truncate block transition-colors"
              >
                {m.question}
              </Link>
              {m.category && (
                <span className={cn(
                  "text-[9px] px-1 py-0.5 rounded border uppercase tracking-wider",
                  categoryColor(m.category)
                )}>
                  {m.category}
                </span>
              )}
            </div>

            {/* Current market price */}
            <div className="text-right shrink-0">
              <div className={cn("font-data text-xs font-medium",
                price >= 0.5 ? "text-green-400" : "text-slate-300"
              )}>
                {formatPrice(price)}
              </div>
            </div>

            {/* Your prob input */}
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={99}
                placeholder="?"
                value={yourProbs[m.id] ?? ""}
                onChange={(e) => setYourProbs((prev) => ({
                  ...prev,
                  [m.id]: Number(e.target.value),
                }))}
                className="w-12 bg-[#141720] border border-[#252a38] rounded px-1.5 py-0.5 text-xs text-slate-300 font-data text-center"
                title="Enter your probability estimate"
              />
              <span className="text-xs text-slate-600">%</span>
            </div>

            {/* Edge */}
            {edge != null && Math.abs(edge) > 0.01 && (
              <div className={cn("font-data text-xs font-semibold w-14 text-right shrink-0",
                edge > 0 ? "text-green-400" : "text-red-400"
              )}>
                {edge > 0 ? "+" : ""}{(edge * 100).toFixed(1)}pp
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-slate-700">
        Enter your probability in the % fields to see your edge vs. current market pricing.
      </p>
    </div>
  );
}
