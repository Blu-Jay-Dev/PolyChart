"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderBook as OrderBookType, SpreadInfo } from "@/lib/polymarket/types";
import { estimateSlippage, TRADE_SIZES } from "@/lib/orderbook/slippage";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

interface OrderBookProps {
  tokenId: string;
}

interface BookData {
  book: OrderBookType;
  spread: SpreadInfo;
}

export function OrderBook({ tokenId }: OrderBookProps) {
  const [data, setData] = useState<BookData | null>(null);
  const [tradeSize, setTradeSize] = useState(1000);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Subscribe to SSE for real-time updates
  useEffect(() => {
    // Fetch initial book
    fetch(`/api/orderbook/${tokenId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.book) setData(d); })
      .catch(() => {});

    // Start SSE stream
    const es = new EventSource(`/api/ws-proxy?token=${tokenId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "book") {
          // Normalise: bids desc (best first), asks asc (best first)
          const bids = [...(msg.bids ?? [])].sort(
            (a: { price: string }, b: { price: string }) => parseFloat(b.price) - parseFloat(a.price)
          );
          const asks = [...(msg.asks ?? [])].sort(
            (a: { price: string }, b: { price: string }) => parseFloat(a.price) - parseFloat(b.price)
          );
          const book: OrderBookType = {
            market: msg.market,
            asset_id: msg.asset_id,
            hash: msg.hash,
            timestamp: msg.timestamp,
            bids,
            asks,
          };
          const topBid = bids[0] ? parseFloat(bids[0].price) : 0;
          const topAsk = asks[0] ? parseFloat(asks[0].price) : 1;
          const spread: SpreadInfo = {
            bid: topBid,
            ask: topAsk,
            spread: topAsk - topBid,
            mid: (topBid + topAsk) / 2,
          };
          setData({ book, spread });
        }
      } catch {
        // Parse error
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [tokenId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        Loading order book...
      </div>
    );
  }

  const { book, spread } = data;
  const maxBidSize = Math.max(...book.bids.slice(0, 15).map((l) => parseFloat(l.size)), 1);
  const maxAskSize = Math.max(...book.asks.slice(0, 15).map((l) => parseFloat(l.size)), 1);
  const slippage = estimateSlippage(book, tradeSize, "buy");

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Spread info */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-green-500/10 border border-green-500/20 p-2">
          <div className="text-xs text-slate-500 mb-0.5">Bid</div>
          <div className="font-data text-sm text-green-400">
            {(spread.bid * 100).toFixed(1)}¢
          </div>
        </div>
        <div className="rounded bg-[#1c2030] border border-[#252a38] p-2">
          <div className="text-xs text-slate-500 mb-0.5">Spread</div>
          <div className="font-data text-sm text-slate-300">
            {(spread.spread * 100).toFixed(2)}¢
          </div>
        </div>
        <div className="rounded bg-red-500/10 border border-red-500/20 p-2">
          <div className="text-xs text-slate-500 mb-0.5">Ask</div>
          <div className="font-data text-sm text-red-400">
            {(spread.ask * 100).toFixed(1)}¢
          </div>
        </div>
      </div>

      {/* Depth ladder */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr] gap-1 text-xs text-slate-600 uppercase tracking-wider mb-1 px-1">
          <div className="grid grid-cols-2 gap-1">
            <span>Size</span>
            <span className="text-right">Bid</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <span>Ask</span>
            <span className="text-right">Size</span>
          </div>
        </div>

        {/* Bids + Asks side by side */}
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => {
            const bid = book.bids[i];
            const ask = book.asks[i];
            const bidSize = bid ? parseFloat(bid.size) : 0;
            const askSize = ask ? parseFloat(ask.size) : 0;
            const bidPct = bid ? (bidSize / maxBidSize) * 100 : 0;
            const askPct = ask ? (askSize / maxAskSize) * 100 : 0;

            return (
              <div key={i} className="grid grid-cols-2 gap-1 text-xs">
                {/* Bid side */}
                <div className="relative flex items-center">
                  <div
                    className="absolute inset-y-0 right-0 bg-green-500/10"
                    style={{ width: `${bidPct}%` }}
                  />
                  <div className="relative grid grid-cols-2 gap-1 w-full px-1 py-0.5">
                    <span className="font-data text-slate-500 text-right">
                      {bid ? parseFloat(bid.size).toFixed(0) : ""}
                    </span>
                    <span className="font-data text-green-400 text-right">
                      {bid ? (parseFloat(bid.price) * 100).toFixed(1) : ""}
                    </span>
                  </div>
                </div>

                {/* Ask side */}
                <div className="relative flex items-center">
                  <div
                    className="absolute inset-y-0 left-0 bg-red-500/10"
                    style={{ width: `${askPct}%` }}
                  />
                  <div className="relative grid grid-cols-2 gap-1 w-full px-1 py-0.5">
                    <span className="font-data text-red-400">
                      {ask ? (parseFloat(ask.price) * 100).toFixed(1) : ""}
                    </span>
                    <span className="font-data text-slate-500">
                      {ask ? parseFloat(ask.size).toFixed(0) : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slippage calculator */}
      <div className="border-t border-[#252a38] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            Slippage Est.
          </span>
          <Select
            value={tradeSize}
            onChange={(e) => setTradeSize(Number(e.target.value))}
            className="h-6 text-xs py-0"
          >
            {TRADE_SIZES.map((s) => (
              <option key={s} value={s}>
                ${s.toLocaleString()}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-600">Avg Price</span>
            <div className="font-data text-slate-300">
              {(slippage.estimatedPrice * 100).toFixed(2)}¢
            </div>
          </div>
          <div>
            <span className="text-slate-600">Slippage</span>
            <div
              className={cn(
                "font-data",
                slippage.slippagePct > 1
                  ? "text-red-400"
                  : slippage.slippagePct > 0.3
                  ? "text-yellow-400"
                  : "text-green-400"
              )}
            >
              {slippage.slippagePct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
