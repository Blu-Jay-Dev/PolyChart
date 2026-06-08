"use client";

import { useEffect, useState } from "react";
import { Zap, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ArbitrageOpportunity } from "@/app/api/arbitrage/route";
import Link from "next/link";

function ProbBadge({ label, price, base }: { label: string; price: number; base?: number }) {
  const diff = base != null ? price - base : 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="font-data text-sm font-medium text-slate-100">
        {(price * 100).toFixed(1)}%
      </span>
      {base != null && Math.abs(diff) > 0.005 && (
        <span className={cn("text-[10px] font-data", diff > 0 ? "text-green-400" : "text-red-400")}>
          {diff > 0 ? "+" : ""}{(diff * 100).toFixed(1)}pp
        </span>
      )}
    </div>
  );
}

function SpreadBar({ spread }: { spread: number }) {
  const pct = Math.min(spread / 0.25, 1); // max visual at 25pp
  const color = spread >= 0.10 ? "bg-green-400" : spread >= 0.05 ? "bg-yellow-400" : "bg-slate-600";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#252a38] rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className={cn("font-data text-xs tabular-nums w-12 text-right",
        spread >= 0.10 ? "text-green-400" : spread >= 0.05 ? "text-yellow-400" : "text-slate-500"
      )}>
        {(spread * 100).toFixed(1)}pp
      </span>
    </div>
  );
}

export default function ArbitragePage() {
  const [opps, setOpps] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [minSpread, setMinSpread] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/arbitrage");
      const data = await res.json();
      setOpps(Array.isArray(data) ? data : []);
    } catch {
      setOpps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = opps.filter((o) => o.maxSpread * 100 >= minSpread);
  const highAlpha = opps.filter((o) => o.maxSpread >= 0.10).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[#252a38] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Arbitrage Scanner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Probability divergence across Polymarket · Kalshi · Manifold
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Min spread:</span>
            <select
              value={minSpread}
              onChange={(e) => setMinSpread(Number(e.target.value))}
              className="bg-[#141720] border border-[#252a38] rounded px-2 py-1 text-slate-300 text-xs"
            >
              <option value={0}>Any</option>
              <option value={3}>3pp+</option>
              <option value={5}>5pp+</option>
              <option value={10}>10pp+</option>
            </select>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <div className="text-xs text-slate-500 mb-1">Cross-Listed Markets</div>
              <div className="font-data text-2xl font-bold text-slate-100">{opps.length}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 mb-1">High Alpha (&gt;10pp)</div>
              <div className={cn("font-data text-2xl font-bold", highAlpha > 0 ? "text-green-400" : "text-slate-400")}>
                {highAlpha}
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500 mb-1">Avg Divergence</div>
              <div className="font-data text-2xl font-bold text-slate-100">
                {opps.length > 0
                  ? (opps.reduce((s, o) => s + o.maxSpread, 0) / opps.length * 100).toFixed(1)
                  : "—"}pp
              </div>
            </Card>
          </div>
        )}

        {/* Opportunity table */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#252a38]">
            <CardTitle>Opportunities — sorted by divergence</CardTitle>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Scanning Polymarket · Kalshi · Manifold…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No opportunities above threshold
            </div>
          ) : (
            <div className="divide-y divide-[#252a38]/50">
              {filtered.map((opp, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#141720] transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Market title */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/market/${opp.polyTokenId}`}
                        className="text-sm text-slate-200 hover:text-blue-400 truncate block transition-colors"
                      >
                        {opp.polyQuestion}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-1">
                        {opp.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-[#252a38] text-slate-500 uppercase tracking-wider"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="flex items-center gap-4">
                      <ProbBadge label="Poly" price={opp.polyPrice} />
                      {opp.kalshiPrice != null && (
                        <ProbBadge label="Kalshi" price={opp.kalshiPrice} base={opp.polyPrice} />
                      )}
                      {opp.manifoldPrice != null && (
                        <ProbBadge label="Manifold" price={opp.manifoldPrice} base={opp.polyPrice} />
                      )}
                    </div>

                    {/* Spread bar */}
                    <div className="w-36">
                      <div className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Max spread</div>
                      <SpreadBar spread={opp.maxSpread} />
                    </div>

                    {/* External links */}
                    <div className="flex flex-col gap-1">
                      {opp.kalshiTicker && (
                        <a
                          href={`https://kalshi.com/markets/${opp.kalshiTicker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-600 hover:text-blue-400 flex items-center gap-0.5"
                        >
                          Kalshi <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {opp.manifoldSlug && (
                        <a
                          href={`https://manifold.markets/${opp.manifoldSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-600 hover:text-blue-400 flex items-center gap-0.5"
                        >
                          Manifold <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-700 text-center">
          Markets matched by keyword similarity. Always verify titles match before trading. Spreads reflect differing resolution criteria.
        </p>
      </div>
    </div>
  );
}
