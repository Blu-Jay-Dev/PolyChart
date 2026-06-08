"use client";

import { useState } from "react";
import { Calculator, Clock, GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { KellyCalculator } from "@/components/tools/kelly-calculator";
import { LiquidityHeatmap } from "@/components/market/liquidity-heatmap";
import { RelatedMarkets } from "@/components/market/related-markets";
import { cn } from "@/lib/utils";

type Tab = "kelly" | "heatmap" | "related";

interface Props {
  tokenId: string;
  marketPrice: number;
  question: string;
  category: string;
}

export function MarketAnalysisPanel({ tokenId, marketPrice, question, category }: Props) {
  const [tab, setTab] = useState<Tab>("kelly");
  const [open, setOpen] = useState(true);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "kelly",   label: "Kelly Sizer",   icon: Calculator },
    { id: "heatmap", label: "Liquidity",      icon: Clock      },
    { id: "related", label: "Related",        icon: GitBranch  },
  ];

  return (
    <div className="border-t border-[#252a38] bg-[#0d0f12] shrink-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#252a38]">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setOpen(true); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-colors",
                tab === t.id && open
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-600 hover:text-slate-400"
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto px-3 py-2 text-slate-700 hover:text-slate-400 transition-colors"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Panel content */}
      {open && (
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 300 }}>
          {tab === "kelly" && (
            <KellyCalculator marketPrice={marketPrice} />
          )}
          {tab === "heatmap" && (
            <LiquidityHeatmap tokenId={tokenId} />
          )}
          {tab === "related" && (
            <RelatedMarkets
              currentQuestion={question}
              category={category}
              currentTokenId={tokenId}
            />
          )}
        </div>
      )}
    </div>
  );
}
