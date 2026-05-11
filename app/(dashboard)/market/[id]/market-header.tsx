"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, StarOff, Bell, ExternalLink } from "lucide-react";
import type { Market } from "@/lib/polymarket/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryColor, formatVolume, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MarketHeaderProps {
  market: Market;
  tokenId: string;
}

export function MarketHeader({ market, tokenId }: MarketHeaderProps) {
  const [watching, setWatching] = useState(false);

  const yesToken =
    market.tokens?.find((t) => t.outcome === "Yes") ?? market.tokens?.[0];
  const price = yesToken?.price ?? 0;

  const toggleWatch = async () => {
    if (watching) {
      await fetch(`/api/watchlist?market_id=${tokenId}`, { method: "DELETE" });
      setWatching(false);
    } else {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: tokenId, market_title: market.question }),
      });
      setWatching(true);
    }
  };

  return (
    <div className="border-b border-[#252a38] bg-[#0a0c0f] px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/markets"
            className="text-slate-600 hover:text-slate-400 mt-0.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-100 truncate">
              {market.question}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {market.category && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded border uppercase tracking-wider",
                    categoryColor(market.category)
                  )}
                >
                  {market.category}
                </span>
              )}
              <span className="text-xs text-slate-600">
                Closes {market.endDate ? formatRelativeTime(market.endDate) : "—"}
              </span>
              {market.resolutionSource && (
                <span className="text-xs text-slate-600">
                  Oracle: {market.resolutionSource}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: price + actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-data text-2xl font-bold text-slate-100">
              {(price * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">
              YES · Vol {formatVolume(market.volume24hr ?? 0)} / 24h
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWatch}
              className={watching ? "text-yellow-400" : ""}
            >
              {watching ? (
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-3.5 w-3.5" />
              )}
            </Button>
            <Link href="/alerts">
              <Button variant="ghost" size="sm">
                <Bell className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <a
              href={`https://polymarket.com/event/${market.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
