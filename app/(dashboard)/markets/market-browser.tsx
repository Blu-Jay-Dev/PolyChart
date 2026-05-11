"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Star, StarOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sparkline } from "@/components/charts/sparkline";
import { formatVolume, formatPrice, formatRelativeTime, categoryColor } from "@/lib/utils";
import type { Market } from "@/lib/polymarket/types";
import { cn } from "@/lib/utils";

const CATEGORIES = ["", "politics", "crypto", "sports", "macro", "tech", "science"];

export function MarketBrowser() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState("volume");
  const [watchlisted, setWatchlisted] = useState<Set<string>>(new Set());
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (category) params.set("category", category);
      if (order) params.set("order", order);
      params.set("limit", "100");

      const res = await fetch(`/api/markets?${params}`);
      const data = await res.json();
      setMarkets(Array.isArray(data) ? data : []);
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, order]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Load watchlist
  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWatchlisted(new Set(data.map((w: { market_id: string }) => w.market_id)));
        }
      })
      .catch(() => {});
  }, []);

  const toggleWatchlist = async (market: Market, tokenId: string) => {
    const isWatched = watchlisted.has(tokenId);
    const next = new Set(watchlisted);
    if (isWatched) {
      next.delete(tokenId);
      setWatchlisted(next);
      await fetch(`/api/watchlist?market_id=${tokenId}`, { method: "DELETE" });
    } else {
      next.add(tokenId);
      setWatchlisted(next);
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: tokenId, market_title: market.question }),
      });
    }
  };

  // Parse clobTokenIds and outcomes from JSON strings returned by Gamma API
  const yesTokenInfo = (m: Market): { token_id: string; price: number } | null => {
    // Prefer legacy tokens array if present
    if (m.tokens && m.tokens.length > 0) {
      const t = m.tokens.find((t) => t.outcome === "Yes") ?? m.tokens![0];
      return { token_id: t.token_id, price: t.price };
    }
    // Parse Gamma API fields
    try {
      const ids: string[] = JSON.parse(m.clobTokenIds ?? "[]");
      const outcomes: string[] = JSON.parse(m.outcomes ?? "[]");
      if (ids.length === 0) return null;
      const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
      const idx = yesIdx >= 0 ? yesIdx : 0;
      return {
        token_id: ids[idx],
        price: m.lastTradePrice ?? (m.bestBid && m.bestAsk ? (m.bestBid + m.bestAsk) / 2 : 0),
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#252a38] bg-[#0d0f12]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
          <Input
            placeholder="Search markets..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 text-xs"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="h-8 text-xs"
        >
          <option value="volume">Sort: Volume</option>
          <option value="liquidity">Sort: Liquidity</option>
          <option value="startDate">Sort: Newest</option>
          <option value="endDate">Sort: Closing Soon</option>
        </Select>
        <span className="text-xs text-slate-600 ml-auto">
          {markets.length} markets
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_100px_100px_80px_40px] gap-3 px-6 py-2 text-xs text-slate-600 uppercase tracking-wider border-b border-[#252a38] bg-[#0a0c0f]">
        <span>Market</span>
        <span className="text-right">YES</span>
        <span className="text-right">24h Vol</span>
        <span className="text-right">7d</span>
        <span className="text-right">Closes</span>
        <span></span>
      </div>

      {/* Market rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
            Loading markets...
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-600">
            <Search className="h-6 w-6 mb-2" />
            <span className="text-sm">No markets found</span>
          </div>
        ) : (
          markets.map((market) => {
            const token = yesTokenInfo(market);
            if (!token) return null;
            const tokenId = token.token_id;
            const price = token.price ?? 0;

            return (
              <div
                key={market.id}
                className="grid grid-cols-[1fr_80px_100px_100px_80px_40px] gap-3 px-6 py-2.5 border-b border-[#252a38]/50 hover:bg-[#141720] transition-colors group"
              >
                {/* Title + category */}
                <div className="flex flex-col justify-center min-w-0">
                  <Link
                    href={`/market/${tokenId}`}
                    className="text-sm text-slate-200 hover:text-blue-400 truncate transition-colors"
                  >
                    {market.question}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {market.category && (
                      <span
                        className={cn(
                          "text-xs px-1 py-0.5 rounded border uppercase tracking-wider",
                          categoryColor(market.category)
                        )}
                      >
                        {market.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* YES price */}
                <div className="flex items-center justify-end">
                  <span
                    className={cn(
                      "font-data text-sm font-medium",
                      price >= 0.5 ? "text-green-400" : "text-slate-300"
                    )}
                  >
                    {formatPrice(price)}
                  </span>
                </div>

                {/* 24h volume */}
                <div className="flex items-center justify-end">
                  <span className="font-data text-xs text-slate-400">
                    {formatVolume(market.volume24hr ?? 0)}
                  </span>
                </div>

                {/* 7d sparkline */}
                <div className="flex items-center justify-end">
                  <Sparkline
                    data={[0.3, 0.35, 0.4, price * 0.9, price * 0.95, price]}
                    width={80}
                    height={24}
                  />
                </div>

                {/* Closes */}
                <div className="flex items-center justify-end">
                  <span className="text-xs text-slate-500">
                    {market.endDate ? formatRelativeTime(market.endDate) : "—"}
                  </span>
                </div>

                {/* Watchlist toggle */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => toggleWatchlist(market, tokenId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-yellow-400"
                  >
                    {watchlisted.has(tokenId) ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
