"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
} from "lightweight-charts";

interface DataPoint {
  time: number;
  value: number;
}

interface PortfolioCurveProps {
  data: DataPoint[];
  height?: number;
}

export function PortfolioCurve({ data, height = 200 }: PortfolioCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length < 2) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "#1c2030" },
        horzLines: { color: "#1c2030" },
      },
      rightPriceScale: { borderColor: "#252a38" },
      timeScale: { borderColor: "#252a38", timeVisible: true },
      width: containerRef.current.clientWidth,
      height,
    });

    chartRef.current = chart;

    const isPositive = data[data.length - 1].value >= data[0].value;
    const color = isPositive ? "#22c55e" : "#ef4444";

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
    });

    series.setData(
      data.map((d) => ({
        time: d.time as unknown as Parameters<typeof series.setData>[0][number]["time"],
        value: d.value,
      }))
    );

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
        Not enough data to display curve
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
