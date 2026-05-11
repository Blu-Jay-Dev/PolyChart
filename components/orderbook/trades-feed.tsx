"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface TradeEntry {
  id: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  time: string;
}

interface TradesFeedProps {
  tokenId: string;
}

export function TradesFeed({ tokenId }: TradesFeedProps) {
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial trades
  useEffect(() => {
    fetch(`/api/orderbook/${tokenId}`)
      .then(() => {
        // Fetch recent trades from CLOB
        return fetch(
          `${process.env.NEXT_PUBLIC_CLOB_URL || "https://clob.polymarket.com"}/trades?token_id=${tokenId}&limit=50`
        );
      })
      .then((r) => r.json())
      .then((data) => {
        const raw = data?.data ?? data ?? [];
        const entries: TradeEntry[] = raw.slice(0, 50).map(
          (t: {
            id?: string;
            taker_order_id?: string;
            trader_side?: string;
            price?: string;
            size?: string;
            match_time?: string;
          }) => ({
            id: t.id || t.taker_order_id || Math.random().toString(),
            side: t.trader_side === "TAKER" ? "BUY" : "SELL",
            price: parseFloat(t.price ?? "0"),
            size: parseFloat(t.size ?? "0"),
            time: t.match_time ?? new Date().toISOString(),
          })
        );
        setTrades(entries);
      })
      .catch(() => {});
  }, [tokenId]);

  // Listen for real-time trade events from SSE
  useEffect(() => {
    const es = new EventSource(`/api/ws-proxy?token=${tokenId}`);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "last_trade_price") {
          const entry: TradeEntry = {
            id: Math.random().toString(),
            side: "BUY",
            price: parseFloat(msg.price),
            size: 0,
            time: new Date().toISOString(),
          };
          setTrades((prev) => [entry, ...prev].slice(0, 100));
        }
      } catch {
        // Ignore parse errors
      }
    };

    return () => es.close();
  }, [tokenId]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-slate-600 uppercase tracking-wider mb-2 px-1">
        Recent Trades
      </div>

      {/* Header */}
      <div className="grid grid-cols-[60px_70px_80px_60px] gap-1 text-xs text-slate-700 px-1 mb-1">
        <span>Time</span>
        <span className="text-right">Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-0.5">
        {trades.length === 0 ? (
          <div className="text-xs text-slate-600 px-1">No trades</div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className={cn(
                "grid grid-cols-[60px_70px_80px_60px] gap-1 text-xs px-1 py-0.5 rounded transition-colors",
                trade.side === "BUY"
                  ? "hover:bg-green-500/5"
                  : "hover:bg-red-500/5"
              )}
            >
              <span className="font-data text-slate-600">
                {formatTime(trade.time)}
              </span>
              <span
                className={cn(
                  "font-data text-right font-medium",
                  trade.side === "BUY" ? "text-green-400" : "text-red-400"
                )}
              >
                {trade.side}
              </span>
              <span className="font-data text-slate-300 text-right">
                {(trade.price * 100).toFixed(1)}¢
              </span>
              <span className="font-data text-slate-500 text-right">
                {trade.size > 0 ? trade.size.toFixed(0) : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
