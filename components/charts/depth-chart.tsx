"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  type IChartApi,
} from "lightweight-charts";
import type { OrderBook } from "@/lib/polymarket/types";

interface DepthChartProps {
  tokenId: string;
}

function buildCumulativeDepth(book: OrderBook) {
  // Bids: sorted desc by price (highest first), cumulate from top
  const bids = book.bids
    .map((l) => ({ price: parseFloat(l.price), size: parseFloat(l.size) }))
    .sort((a, b) => b.price - a.price);

  // Asks: sorted asc by price (lowest first), cumulate from top
  const asks = book.asks
    .map((l) => ({ price: parseFloat(l.price), size: parseFloat(l.size) }))
    .sort((a, b) => a.price - b.price);

  let cumBid = 0;
  const bidDepth = bids.map((l) => {
    cumBid += l.size;
    return { price: l.price, cumulative: cumBid };
  });

  let cumAsk = 0;
  const askDepth = asks.map((l) => {
    cumAsk += l.size;
    return { price: l.price, cumulative: cumAsk };
  });

  return { bidDepth, askDepth };
}

export function DepthChart({ tokenId }: DepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);

  // Subscribe to SSE for live order book
  useEffect(() => {
    fetch(`/api/orderbook/${tokenId}`)
      .then((r) => r.json())
      .then((data) => data.book && setBook(data.book))
      .catch(() => {});

    const es = new EventSource(`/api/ws-proxy?token=${tokenId}`);
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "book") {
          setBook({
            market: msg.market,
            asset_id: msg.asset_id,
            hash: msg.hash,
            timestamp: msg.timestamp,
            bids: msg.bids ?? [],
            asks: msg.asks ?? [],
          });
        }
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, [tokenId]);

  // Render chart when book updates
  useEffect(() => {
    if (!containerRef.current || !book) return;

    // Remove old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d0f12" },
        textColor: "#64748b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1c2030" },
        horzLines: { color: "#1c2030" },
      },
      rightPriceScale: { borderColor: "#252a38" },
      timeScale: { visible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    const { bidDepth, askDepth } = buildCumulativeDepth(book);

    if (bidDepth.length > 0) {
      const bidSeries = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "#22c55e30",
        bottomColor: "#22c55e05",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      // Use price as X — lightweight-charts uses time axis, so we map price * 1000 as fake time
      bidSeries.setData(
        bidDepth.map((d) => ({
          time: Math.round(d.price * 1000) as unknown as Parameters<
            typeof bidSeries.setData
          >[0][number]["time"],
          value: d.cumulative,
        }))
      );
    }

    if (askDepth.length > 0) {
      const askSeries = chart.addSeries(AreaSeries, {
        lineColor: "#ef4444",
        topColor: "#ef444430",
        bottomColor: "#ef444405",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      askSeries.setData(
        askDepth.map((d) => ({
          time: Math.round(d.price * 1000) as unknown as Parameters<
            typeof askSeries.setData
          >[0][number]["time"],
          value: d.cumulative,
        }))
      );
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [book]);

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>Depth</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-green-500 inline-block" />
            <span>Bids</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-red-500 inline-block" />
            <span>Asks</span>
          </span>
        </div>
      </div>
      {!book ? (
        <div className="flex items-center justify-center flex-1 text-slate-600 text-xs">
          Connecting...
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 w-full" />
      )}
    </div>
  );
}
