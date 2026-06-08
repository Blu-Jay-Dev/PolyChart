"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { LiquidityHeatmapData } from "@/app/api/liquidity-heatmap/[id]/route";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12a";
  if (i === 12) return "12p";
  if (i < 12) return `${i}a`;
  return `${i - 12}p`;
});

interface Props { tokenId: string }

export function LiquidityHeatmap({ tokenId }: Props) {
  const [data, setData] = useState<LiquidityHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/liquidity-heatmap/${tokenId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tokenId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-600 text-xs">
        Loading heatmap…
      </div>
    );
  }
  if (!data || data.cells.length === 0) return null;

  const maxVol = Math.max(...data.cells.map((c) => c.volume), 1);

  const peakDayName = DAYS[data.peakDay];
  const peakHourName = HOURS[data.peakHour];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Peak liquidity: <span className="text-slate-300">{peakDayName} {peakHourName} UTC</span>
        </span>
        <span className="text-xs text-slate-600">UTC hours</span>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Hour labels */}
          <div className="flex mb-0.5 ml-8">
            {HOURS.map((h, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[8px] text-slate-700"
                style={{ minWidth: 20 }}
              >
                {i % 4 === 0 ? h : ""}
              </div>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((day, d) => (
            <div key={d} className="flex items-center gap-1 mb-0.5">
              <span className="text-[9px] text-slate-600 w-7 text-right shrink-0">{day}</span>
              {HOURS.map((_, h) => {
                const cell = data.cells.find((c) => c.day === d && c.hour === h);
                const vol = cell?.volume ?? 0;
                const intensity = vol / maxVol;
                const isPeak = d === data.peakDay && h === data.peakHour;

                return (
                  <div
                    key={h}
                    className={cn(
                      "flex-1 rounded-sm transition-colors",
                      isPeak && "ring-1 ring-blue-400"
                    )}
                    style={{
                      minWidth: 20,
                      height: 14,
                      backgroundColor: intensity < 0.01
                        ? "#1c2030"
                        : `rgba(59,130,246,${0.15 + intensity * 0.85})`,
                    }}
                    title={`${day} ${HOURS[h]} UTC · $${vol.toFixed(0)} vol · ${cell?.tradeCount ?? 0} trades`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] text-slate-700">
        <div className="w-3 h-2.5 rounded-sm bg-[#1c2030]" /> Low
        <div className="w-3 h-2.5 rounded-sm bg-blue-500/40" /> Medium
        <div className="w-3 h-2.5 rounded-sm bg-blue-500" /> High
      </div>
    </div>
  );
}
