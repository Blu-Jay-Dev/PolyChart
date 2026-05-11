"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  ColorType,
} from "lightweight-charts";
import { computeSMA } from "@/lib/ohlc/builder";
import type { OHLCBar, TimeFrame } from "@/lib/polymarket/types";
import { Button } from "@/components/ui/button";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";

interface CandleChartProps {
  tokenId: string;
  title?: string;
}

const TIMEFRAMES: TimeFrame[] = ["1H", "4H", "1D", "1W"];
const SMA_PERIODS = [7, 14, 30];
const SMA_COLORS = ["#60a5fa", "#a78bfa", "#fb923c"];

export function CandleChart({ tokenId, title }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRefs = useRef<Array<ISeriesApi<"Line">>>([]);

  const [timeframe, setTimeframe] = useState<TimeFrame>("1D");
  const [bars, setBars] = useState<OHLCBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSMAs, setActiveSMAs] = useState<Set<number>>(new Set([7]));
  const [hoverData, setHoverData] = useState<CandlestickData | null>(null);

  const fetchOHLC = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ohlc/${tokenId}?tf=${timeframe}`);
      const data = await res.json();
      const raw: OHLCBar[] = Array.isArray(data) ? data : [];
      // lightweight-charts requires strictly ascending time order
      const sorted = [...raw].sort((a, b) => a.time - b.time);
      // Deduplicate bars with identical timestamps (keep last)
      const deduped = sorted.filter(
        (b, i) => i === 0 || b.time !== sorted[i - 1].time
      );
      setBars(deduped);
    } catch {
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, timeframe]);

  useEffect(() => {
    fetchOHLC();
  }, [fetchOHLC]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d0f12" },
        textColor: "#64748b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1c2030" },
        horzLines: { color: "#1c2030" },
      },
      crosshair: {
        vertLine: { color: "#3b82f6", width: 1, style: 2 },
        horzLine: { color: "#3b82f6", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "#252a38",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#252a38",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeriesRef.current = candleSeries;

    // Volume series in a separate pane
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // SMA series
    smaSeriesRefs.current = SMA_PERIODS.map((_, i) =>
      chart.addSeries(LineSeries, {
        color: SMA_COLORS[i],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        visible: false,
      })
    );

    // Crosshair move handler for OHLC display
    chart.subscribeCrosshairMove((param) => {
      if (param.seriesData.size > 0) {
        const data = param.seriesData.get(candleSeries);
        if (data && "open" in data) {
          setHoverData(data as CandlestickData);
        }
      } else {
        setHoverData(null);
      }
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRefs.current = [];
    };
  }, []);

  // Update data when bars change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    try {
      const candleData: CandlestickData[] = bars.map((b) => ({
        time: b.time as unknown as CandlestickData["time"],
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));

      const volumeData: HistogramData[] = bars.map((b) => ({
        time: b.time as unknown as HistogramData["time"],
        value: b.volume,
        color: b.close >= b.open ? "#22c55e30" : "#ef444430",
      }));

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      // Update SMA series
      SMA_PERIODS.forEach((period, i) => {
        const series = smaSeriesRefs.current[i];
        if (!series) return;

        const smaData = computeSMA(bars, period);
        try {
          series.setData(
            smaData.map((d) => ({
              time: d.time as unknown as LineData["time"],
              value: d.value,
            }))
          );
        } catch {
          // SMA set failed (e.g. timestamp issue) — skip overlay
        }
        series.applyOptions({ visible: activeSMAs.has(period) });
      });

      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.warn("[CandleChart] setData error:", err);
      // Clear all series on bad data to avoid crash
      try {
        candleSeriesRef.current?.setData([]);
        volumeSeriesRef.current?.setData([]);
      } catch {
        // ignore
      }
    }
  }, [bars, activeSMAs]);

  const toggleSMA = (period: number) => {
    setActiveSMAs((prev) => {
      const next = new Set(prev);
      if (next.has(period)) {
        next.delete(period);
      } else {
        next.add(period);
      }
      return next;
    });
  };

  const formatOHLC = (val: number) => (val * 100).toFixed(1) + "%";

  return (
    <div className="flex flex-col h-full">
      {/* Chart toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#252a38]">
        {/* Timeframe buttons */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2 py-0.5 text-xs rounded transition-colors",
                timeframe === tf
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-600 hover:text-slate-400"
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[#252a38] mx-1" />

        {/* SMA toggles */}
        {SMA_PERIODS.map((period, i) => (
          <button
            key={period}
            onClick={() => toggleSMA(period)}
            className={cn(
              "px-2 py-0.5 text-xs rounded transition-colors border",
              activeSMAs.has(period)
                ? `border-[${SMA_COLORS[i]}]/40 text-[${SMA_COLORS[i]}]`
                : "border-transparent text-slate-600 hover:text-slate-400"
            )}
            style={
              activeSMAs.has(period)
                ? { color: SMA_COLORS[i], borderColor: SMA_COLORS[i] + "40" }
                : {}
            }
          >
            SMA{period}
          </button>
        ))}

        {/* OHLC display on crosshair */}
        {hoverData && (
          <div className="ml-4 flex items-center gap-3 text-xs font-data">
            <span className="text-slate-600">O</span>
            <span className="text-slate-300">{formatOHLC(hoverData.open)}</span>
            <span className="text-slate-600">H</span>
            <span className="text-green-400">{formatOHLC(hoverData.high)}</span>
            <span className="text-slate-600">L</span>
            <span className="text-red-400">{formatOHLC(hoverData.low)}</span>
            <span className="text-slate-600">C</span>
            <span
              className={
                hoverData.close >= hoverData.open
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {formatOHLC(hoverData.close)}
            </span>
          </div>
        )}
      </div>

      {/* Chart container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10">
            <ChartSkeleton />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
