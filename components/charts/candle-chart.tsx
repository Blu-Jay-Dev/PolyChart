"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type LogicalRange,
  ColorType,
} from "lightweight-charts";
import {
  computeSMA,
  computeEMA,
  computeRSI,
  computeBollingerBands,
} from "@/lib/ohlc/builder";
import type { OHLCBar, TimeFrame } from "@/lib/polymarket/types";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";

interface CandleChartProps {
  tokenId: string;
  title?: string;
}

const TIMEFRAMES: TimeFrame[] = ["1H", "4H", "1D", "1W"];

const SMA_DEFS = [
  { period: 7,  color: "#60a5fa" },
  { period: 14, color: "#a78bfa" },
  { period: 30, color: "#fb923c" },
];
const EMA_DEFS = [
  { period: 9,  color: "#34d399" },
  { period: 21, color: "#f472b6" },
];

const CHART_OPTS = (w: number, h: number) => ({
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
    vertLine: { color: "#3b82f6", width: 1 as const, style: 2 },
    horzLine: { color: "#3b82f6", width: 1 as const, style: 2 },
  },
  rightPriceScale: { borderColor: "#252a38" },
  timeScale: { borderColor: "#252a38", timeVisible: true, secondsVisible: false },
  width: w,
  height: h,
});

function setSeriesData<T>(
  series: ISeriesApi<"Line"> | null,
  data: Array<{ time: number; value: number }>,
  visible: boolean
) {
  if (!series) return;
  try {
    series.setData(
      data.map((d) => ({
        time: d.time as unknown as LineData["time"],
        value: d.value,
      }))
    );
    series.applyOptions({ visible });
  } catch {
    // timestamp ordering issue — skip overlay
  }
}

export function CandleChart({ tokenId }: CandleChartProps) {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const containerRef    = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  // ── Chart / series refs ───────────────────────────────────────────────────
  const chartRef       = useRef<IChartApi | null>(null);
  const rsiChartRef    = useRef<IChartApi | null>(null);
  const candleRef      = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef      = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaRefs        = useRef<Array<ISeriesApi<"Line">>>([]);
  const emaRefs        = useRef<Array<ISeriesApi<"Line">>>([]);
  // BB: [upper, middle, lower]
  const bbRefs         = useRef<Array<ISeriesApi<"Line">>>([]);
  const rsiSeriesRef   = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiOBRef       = useRef<ISeriesApi<"Line"> | null>(null); // 70 line
  const rsiOSRef       = useRef<ISeriesApi<"Line"> | null>(null); // 30 line
  const priceLineRefs  = useRef<ReturnType<NonNullable<typeof candleRef.current>["createPriceLine"]>[]>([]);
  const lastPriceRef   = useRef<number | null>(null);
  const drawModeRef    = useRef<"none" | "hline">("none");

  // ── State ─────────────────────────────────────────────────────────────────
  const [timeframe,  setTimeframe]  = useState<TimeFrame>("1D");
  const [bars,       setBars]       = useState<OHLCBar[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeSMAs, setActiveSMAs] = useState<Set<number>>(new Set([7]));
  const [activeEMAs, setActiveEMAs] = useState<Set<number>>(new Set());
  const [showBB,     setShowBB]     = useState(false);
  const [showVol,    setShowVol]    = useState(true);
  const [showRSI,    setShowRSI]    = useState(false);
  const [drawMode,   setDrawMode]   = useState<"none" | "hline">("none");
  const [hoverData,  setHoverData]  = useState<CandlestickData | null>(null);

  // Keep drawModeRef in sync
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);

  // ── Fetch OHLC ────────────────────────────────────────────────────────────
  const fetchOHLC = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/ohlc/${tokenId}?tf=${timeframe}`);
      const data = await res.json();
      const raw: OHLCBar[] = Array.isArray(data) ? data : [];
      const sorted  = [...raw].sort((a, b) => a.time - b.time);
      const deduped = sorted.filter((b, i) => i === 0 || b.time !== sorted[i - 1].time);
      setBars(deduped);
    } catch {
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [tokenId, timeframe]);

  useEffect(() => { fetchOHLC(); }, [fetchOHLC]);

  // ── Init main chart ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(
      containerRef.current,
      CHART_OPTS(containerRef.current.clientWidth, containerRef.current.clientHeight)
    );
    chart.applyOptions({
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.25 } },
    });
    chartRef.current = chart;

    // Candlestick
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    candleRef.current = candle;

    // Volume
    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeRef.current = vol;

    // SMAs
    smaRefs.current = SMA_DEFS.map((d) =>
      chart.addSeries(LineSeries, {
        color: d.color, lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: false, visible: false,
      })
    );

    // EMAs
    emaRefs.current = EMA_DEFS.map((d) =>
      chart.addSeries(LineSeries, {
        color: d.color, lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: false, visible: false,
      })
    );

    // Bollinger Bands: upper (dashed), middle (solid), lower (dashed)
    bbRefs.current = [
      chart.addSeries(LineSeries, {
        color: "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dashed,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: false, visible: false,
      }),
      chart.addSeries(LineSeries, {
        color: "#64748b", lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: false, visible: false,
      }),
      chart.addSeries(LineSeries, {
        color: "#94a3b8", lineWidth: 1, lineStyle: LineStyle.Dashed,
        priceLineVisible: false, lastValueVisible: false,
        crosshairMarkerVisible: false, visible: false,
      }),
    ];

    // Crosshair: track last price for drawing tool + hover display
    chart.subscribeCrosshairMove((param) => {
      if (param.seriesData.size > 0) {
        const d = param.seriesData.get(candle);
        if (d && "open" in d) {
          setHoverData(d as CandlestickData);
          lastPriceRef.current = (d as CandlestickData).close;
        }
      } else {
        setHoverData(null);
      }
      // Also grab price from coordinate for drawing tool when off a candle
      if (param.point && candleRef.current) {
        try {
          const p = candleRef.current.coordinateToPrice(param.point.y);
          if (p != null) lastPriceRef.current = p as number;
        } catch { /* ignore */ }
      }
    });

    // Click handler for drawing tool
    chart.subscribeClick((param) => {
      if (drawModeRef.current !== "hline") return;
      const price = lastPriceRef.current;
      if (price == null || !candleRef.current) return;
      const line = candleRef.current.createPriceLine({
        price,
        color: "#f59e0b",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: (price * 100).toFixed(1) + "%",
      });
      priceLineRefs.current.push(line);
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current   = null;
      candleRef.current  = null;
      volumeRef.current  = null;
      smaRefs.current    = [];
      emaRefs.current    = [];
      bbRefs.current     = [];
      priceLineRefs.current = [];
    };
  }, []);

  // ── RSI sub-chart ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showRSI || !rsiContainerRef.current || !chartRef.current) return;

    const rsiChart = createChart(
      rsiContainerRef.current,
      CHART_OPTS(rsiContainerRef.current.clientWidth, rsiContainerRef.current.clientHeight)
    );
    rsiChart.applyOptions({
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { visible: false }, // time axis hidden on RSI panel
    });
    rsiChartRef.current = rsiChart;

    // RSI line
    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#a78bfa", lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true,
    });
    rsiSeriesRef.current = rsiSeries;

    // Reference lines: 70 (overbought) and 30 (oversold)
    rsiOBRef.current = rsiChart.addSeries(LineSeries, {
      color: "#ef444460", lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    rsiOSRef.current = rsiChart.addSeries(LineSeries, {
      color: "#22c55e60", lineWidth: 1, lineStyle: LineStyle.Dashed,
      priceLineVisible: false, lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // Two-way time scale sync
    let syncing = false;
    const syncMain = (range: LogicalRange | null) => {
      if (!range || syncing) return;
      syncing = true;
      rsiChart.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    const syncRSI = (range: LogicalRange | null) => {
      if (!range || syncing) return;
      syncing = true;
      chartRef.current?.timeScale().setVisibleLogicalRange(range);
      syncing = false;
    };
    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncMain);
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange(syncRSI);

    // Resize observer for RSI panel
    const observer = new ResizeObserver(() => {
      if (rsiContainerRef.current)
        rsiChart.applyOptions({
          width:  rsiContainerRef.current.clientWidth,
          height: rsiContainerRef.current.clientHeight,
        });
    });
    observer.observe(rsiContainerRef.current);

    return () => {
      observer.disconnect();
      chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(syncMain);
      rsiChart.remove();
      rsiChartRef.current  = null;
      rsiSeriesRef.current = null;
      rsiOBRef.current     = null;
      rsiOSRef.current     = null;
    };
  }, [showRSI]);

  // ── Update data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;

    try {
      // Candles
      const candleData: CandlestickData[] = bars.map((b) => ({
        time:  b.time  as unknown as CandlestickData["time"],
        open:  b.open,
        high:  b.high,
        low:   b.low,
        close: b.close,
      }));
      candleRef.current.setData(candleData);

      // Volume (hide when all-zero)
      const hasVolume = bars.some((b) => b.volume > 0);
      const volData: HistogramData[] = bars.map((b) => ({
        time:  b.time as unknown as HistogramData["time"],
        value: b.volume,
        color: b.close >= b.open ? "#22c55e30" : "#ef444430",
      }));
      volumeRef.current.setData(volData);
      volumeRef.current.applyOptions({ visible: showVol && hasVolume });

      // SMAs
      SMA_DEFS.forEach((d, i) => {
        setSeriesData(
          smaRefs.current[i] ?? null,
          computeSMA(bars, d.period),
          activeSMAs.has(d.period)
        );
      });

      // EMAs
      EMA_DEFS.forEach((d, i) => {
        setSeriesData(
          emaRefs.current[i] ?? null,
          computeEMA(bars, d.period),
          activeEMAs.has(d.period)
        );
      });

      // Bollinger Bands
      const bb = computeBollingerBands(bars);
      const [bbUp, bbMid, bbLow] = bbRefs.current;
      setSeriesData(bbUp  ?? null, bb.upper,  showBB);
      setSeriesData(bbMid ?? null, bb.middle, showBB);
      setSeriesData(bbLow ?? null, bb.lower,  showBB);

      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.warn("[CandleChart] setData error:", err);
    }
  }, [bars, activeSMAs, activeEMAs, showBB, showVol]);

  // ── Update RSI data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!showRSI || !rsiSeriesRef.current || bars.length === 0) return;

    const rsiData = computeRSI(bars);
    if (rsiData.length === 0) return;

    try {
      rsiSeriesRef.current.setData(
        rsiData.map((d) => ({
          time:  d.time as unknown as LineData["time"],
          value: d.value,
        }))
      );

      // Reference lines span the entire data range
      const firstT = rsiData[0].time as unknown as LineData["time"];
      const lastT  = rsiData[rsiData.length - 1].time as unknown as LineData["time"];
      rsiOBRef.current?.setData([{ time: firstT, value: 70 }, { time: lastT, value: 70 }]);
      rsiOSRef.current?.setData([{ time: firstT, value: 30 }, { time: lastT, value: 30 }]);

      // Sync RSI chart to match current main chart view
      const range = chartRef.current?.timeScale().getVisibleLogicalRange();
      if (range) rsiChartRef.current?.timeScale().setVisibleLogicalRange(range);
    } catch (err) {
      console.warn("[CandleChart] RSI setData error:", err);
    }
  }, [bars, showRSI]);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSMA = (period: number) =>
    setActiveSMAs((prev) => {
      const s = new Set(prev);
      s.has(period) ? s.delete(period) : s.add(period);
      return s;
    });

  const toggleEMA = (period: number) =>
    setActiveEMAs((prev) => {
      const s = new Set(prev);
      s.has(period) ? s.delete(period) : s.add(period);
      return s;
    });

  const clearDrawings = () => {
    if (!candleRef.current) return;
    for (const line of priceLineRefs.current) {
      try { candleRef.current.removePriceLine(line); } catch { /* ignore */ }
    }
    priceLineRefs.current = [];
  };

  const fmt = (v: number) => (v * 100).toFixed(1) + "%";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#252a38] flex-wrap">

        {/* Timeframes */}
        <div className="flex items-center gap-0.5">
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

        <div className="w-px h-4 bg-[#252a38]" />

        {/* SMAs */}
        {SMA_DEFS.map((d) => (
          <button
            key={`sma${d.period}`}
            onClick={() => toggleSMA(d.period)}
            className="px-1.5 py-0.5 text-xs rounded transition-colors border"
            style={
              activeSMAs.has(d.period)
                ? { color: d.color, borderColor: d.color + "40" }
                : { color: "#475569", borderColor: "transparent" }
            }
          >
            SMA{d.period}
          </button>
        ))}

        {/* EMAs */}
        {EMA_DEFS.map((d) => (
          <button
            key={`ema${d.period}`}
            onClick={() => toggleEMA(d.period)}
            className="px-1.5 py-0.5 text-xs rounded transition-colors border"
            style={
              activeEMAs.has(d.period)
                ? { color: d.color, borderColor: d.color + "40" }
                : { color: "#475569", borderColor: "transparent" }
            }
          >
            EMA{d.period}
          </button>
        ))}

        {/* Bollinger Bands */}
        <button
          onClick={() => setShowBB((v) => !v)}
          className={cn(
            "px-1.5 py-0.5 text-xs rounded transition-colors border",
            showBB
              ? "text-slate-300 border-slate-500/40"
              : "text-slate-600 border-transparent"
          )}
        >
          BB
        </button>

        <div className="w-px h-4 bg-[#252a38]" />

        {/* Volume */}
        <button
          onClick={() => setShowVol((v) => !v)}
          className={cn(
            "px-1.5 py-0.5 text-xs rounded transition-colors border",
            showVol
              ? "text-slate-300 border-slate-500/40"
              : "text-slate-600 border-transparent"
          )}
        >
          Vol
        </button>

        {/* RSI panel */}
        <button
          onClick={() => setShowRSI((v) => !v)}
          className={cn(
            "px-1.5 py-0.5 text-xs rounded transition-colors border",
            showRSI
              ? "text-purple-400 border-purple-500/40"
              : "text-slate-600 border-transparent"
          )}
        >
          RSI
        </button>

        <div className="w-px h-4 bg-[#252a38]" />

        {/* Drawing tools */}
        <button
          onClick={() => setDrawMode((m) => (m === "hline" ? "none" : "hline"))}
          title="Horizontal line"
          className={cn(
            "px-1.5 py-0.5 text-xs rounded transition-colors border font-mono",
            drawMode === "hline"
              ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
              : "text-slate-600 border-transparent"
          )}
        >
          —
        </button>
        <button
          onClick={clearDrawings}
          title="Clear drawings"
          className="px-1.5 py-0.5 text-xs rounded text-slate-600 hover:text-red-400 border border-transparent transition-colors"
        >
          ✕
        </button>

        {/* Drawing mode indicator */}
        {drawMode === "hline" && (
          <span className="text-xs text-amber-400 ml-1 animate-pulse">
            Click chart to place line
          </span>
        )}

        {/* OHLC hover display */}
        {hoverData && drawMode === "none" && (
          <div className="ml-2 flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-600">O</span>
            <span className="text-slate-300">{fmt(hoverData.open)}</span>
            <span className="text-slate-600">H</span>
            <span className="text-green-400">{fmt(hoverData.high)}</span>
            <span className="text-slate-600">L</span>
            <span className="text-red-400">{fmt(hoverData.low)}</span>
            <span className="text-slate-600">C</span>
            <span className={hoverData.close >= hoverData.open ? "text-green-400" : "text-red-400"}>
              {fmt(hoverData.close)}
            </span>
          </div>
        )}
      </div>

      {/* ── Main chart ── */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ cursor: drawMode === "hline" ? "crosshair" : "default" }}
      >
        {loading && (
          <div className="absolute inset-0 z-10">
            <ChartSkeleton />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* ── RSI sub-panel ── */}
      {showRSI && (
        <div className="h-28 border-t border-[#252a38] relative shrink-0">
          <div className="absolute top-1 left-2 text-[10px] text-slate-600 z-10 pointer-events-none">
            RSI(14)
          </div>
          <div ref={rsiContainerRef} className="w-full h-full" />
        </div>
      )}
    </div>
  );
}
