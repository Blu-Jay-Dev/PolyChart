"use client";

import { useEffect, useRef, useState } from "react";
import { Target, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CalibrationData, CalibrationBucket } from "@/app/api/calibration/route";

const CATEGORIES = ["", "politics", "crypto", "sports", "macro", "tech", "science"];

function CalibrationChart({ data }: { data: CalibrationData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#252a38";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (cH * i) / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${100 - i * 25}%`, pad.left - 6, y + 3);
    }

    const buckets = data.buckets;
    const bW = cW / buckets.length;

    // Draw bars (actual rate)
    buckets.forEach((b, i) => {
      const x = pad.left + i * bW + bW * 0.15;
      const bwInner = bW * 0.7;
      const actual = b.count > 0 ? b.actualRate : b.impliedRate;
      const barH = actual * cH;
      const y = pad.top + cH - barH;

      const color = b.edge > 0.05 ? "#22c55e" : b.edge < -0.05 ? "#ef4444" : "#3b82f6";
      ctx.fillStyle = color + "99";
      ctx.fillRect(x, y, bwInner, barH);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, bwInner, 2);

      // Label
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(b.bucket, pad.left + i * bW + bW / 2, H - 8);

      // Sample size
      if (b.count > 0) {
        ctx.fillStyle = "#334155";
        ctx.fillText(`n=${b.count}`, pad.left + i * bW + bW / 2, pad.top + cH - barH - 4);
      }
    });

    // Perfect calibration line (diagonal)
    ctx.strokeStyle = "#475569";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + cH);
    ctx.lineTo(pad.left + cW, pad.top);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.fillStyle = "#475569";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("— perfect calibration", pad.left + 4, pad.top + 14);
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 280 }}
    />
  );
}

function EdgeTable({ buckets }: { buckets: CalibrationBucket[] }) {
  const withData = buckets.filter((b) => b.count > 0);
  if (withData.length === 0) return null;

  const bestLong = [...withData].sort((a, b) => b.edge - a.edge)[0];
  const bestShort = [...withData].sort((a, b) => a.edge - b.edge)[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <div className="text-xs text-slate-500 mb-1">Best Value (overpriced NO)</div>
        <div className="text-sm font-medium text-green-400">{bestLong.bucket}</div>
        <div className="text-xs text-slate-400 mt-1">
          Implied {(bestLong.impliedRate * 100).toFixed(0)}% · Actual {(bestLong.actualRate * 100).toFixed(0)}%
        </div>
        <div className="font-data text-green-400 text-sm mt-1">
          +{(bestLong.edge * 100).toFixed(1)}% edge
        </div>
      </Card>
      <Card>
        <div className="text-xs text-slate-500 mb-1">Avoid (overpriced YES)</div>
        <div className="text-sm font-medium text-red-400">{bestShort.bucket}</div>
        <div className="text-xs text-slate-400 mt-1">
          Implied {(bestShort.impliedRate * 100).toFixed(0)}% · Actual {(bestShort.actualRate * 100).toFixed(0)}%
        </div>
        <div className="font-data text-red-400 text-sm mt-1">
          {(bestShort.edge * 100).toFixed(1)}% edge
        </div>
      </Card>
    </div>
  );
}

export default function CalibrationPage() {
  const [data, setData] = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  const load = async (cat: string) => {
    setLoading(true);
    try {
      const params = cat ? `?category=${cat}` : "";
      const res = await fetch(`/api/calibration${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(category); }, [category]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#252a38] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-400" />
            Market Calibration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            How accurate was Polymarket at each probability band?
          </p>
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 text-xs w-36"
        >
          <option value="">All categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </Select>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats row */}
        {data && !loading && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <div className="text-xs text-slate-500 mb-1">Markets Analyzed</div>
              <div className="font-data text-2xl font-bold text-slate-100">{data.totalMarkets}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 mb-1">Brier Score</div>
              <div className={cn(
                "font-data text-2xl font-bold",
                data.overallAccuracy < 0.15 ? "text-green-400" : data.overallAccuracy < 0.25 ? "text-yellow-400" : "text-red-400"
              )}>
                {data.overallAccuracy.toFixed(3)}
              </div>
              <div className="text-xs text-slate-600">lower = better · perfect = 0</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 mb-1">Calibration</div>
              <div className={cn(
                "font-data text-2xl font-bold",
                data.overallAccuracy < 0.15 ? "text-green-400" : "text-yellow-400"
              )}>
                {data.overallAccuracy < 0.10 ? "Excellent" : data.overallAccuracy < 0.20 ? "Good" : "Fair"}
              </div>
            </Card>
          </div>
        )}

        {/* Chart */}
        <Card padding="sm">
          <CardHeader>
            <CardTitle>Actual Resolution Rate vs. Implied Probability</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Analyzing resolved markets…
            </div>
          ) : data ? (
            <CalibrationChart data={data} />
          ) : (
            <div className="flex items-center justify-center h-64 text-red-400 text-sm">Failed to load</div>
          )}
        </Card>

        {/* Edge insight cards */}
        {data && !loading && data.totalMarkets > 0 && (
          <EdgeTable buckets={data.buckets} />
        )}

        <Card padding="sm">
          <CardHeader><CardTitle>How to Read This</CardTitle></CardHeader>
          <div className="text-xs text-slate-400 space-y-1.5">
            <p>Each bar shows how often markets in that probability band actually resolved YES.</p>
            <p><span className="text-green-400">Green bars</span> = market was underpriced (YES resolved more often than implied → buy edge).</p>
            <p><span className="text-red-400">Red bars</span> = market was overpriced (YES resolved less often than implied → avoid or sell).</p>
            <p>The diagonal dashed line is <span className="text-slate-300">perfect calibration</span> — what a fully efficient market would look like.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
