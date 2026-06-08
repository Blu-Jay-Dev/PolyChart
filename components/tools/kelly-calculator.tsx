"use client";

import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

interface KellyCalculatorProps {
  marketPrice: number; // current YES price (0-1)
}

export function KellyCalculator({ marketPrice }: KellyCalculatorProps) {
  const [yourProb, setYourProb] = useState(Math.round(marketPrice * 100));
  const [bankroll, setBankroll] = useState(1000);
  const [fraction, setFraction] = useState(0.25); // fractional Kelly (0.25 = quarter Kelly)

  const result = useMemo(() => {
    const p = yourProb / 100;
    const price = marketPrice;
    if (price <= 0 || price >= 1 || p <= 0 || p >= 1) return null;

    // Kelly fraction for a binary bet:
    //   b = net odds on win (payout per $ risked)
    //   For YES at price: win $1, risk $price → b = (1 - price) / price
    const b = (1 - price) / price;
    const kelly = (p * b - (1 - p)) / b;

    const fractionalKelly = kelly * fraction;
    const betSize = Math.max(0, bankroll * fractionalKelly);
    const expectedValue = p * (1 - price) - (1 - p) * price;
    const riskOfRuin = kelly <= 0 ? 1 : Math.pow(1 - kelly, 20); // approx over 20 bets

    return {
      kelly,
      fractionalKelly,
      betSize,
      expectedValue,
      ev100: expectedValue * 100,
      edge: p - price,
      riskOfRuin,
    };
  }, [yourProb, bankroll, fraction, marketPrice]);

  const edgeColor = result
    ? result.edge > 0.02 ? "text-green-400"
    : result.edge < -0.02 ? "text-red-400"
    : "text-slate-400"
    : "text-slate-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
        <Calculator className="h-3.5 w-3.5" />
        Kelly Criterion Position Sizer
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Market price (YES)
            </label>
            <div className="font-data text-lg font-semibold text-slate-200">
              {(marketPrice * 100).toFixed(1)}%
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Your probability estimate
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={99}
                value={yourProb}
                onChange={(e) => setYourProb(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="font-data text-sm text-slate-200 w-10 text-right">{yourProb}%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Bankroll
            </label>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(Math.max(1, Number(e.target.value)))}
                className="bg-[#0d0f12] border border-[#252a38] rounded px-2 py-1 text-sm text-slate-200 w-full font-data"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Kelly fraction
            </label>
            <div className="flex gap-1.5">
              {[0.25, 0.5, 1.0].map((f) => (
                <button
                  key={f}
                  onClick={() => setFraction(f)}
                  className={cn(
                    "flex-1 py-1 text-xs rounded border transition-colors",
                    fraction === f
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                      : "border-[#252a38] text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f === 0.25 ? "¼" : f === 0.5 ? "½" : "Full"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div className="space-y-2">
            <div className="rounded border border-[#252a38] bg-[#0d0f12] p-3">
              <div className="text-xs text-slate-500 mb-1">Optimal bet size</div>
              <div className={cn("font-data text-2xl font-bold",
                result.betSize > 0 ? "text-slate-100" : "text-red-400"
              )}>
                {result.betSize > 0 ? `$${result.betSize.toFixed(2)}` : "No bet"}
              </div>
              {result.betSize > 0 && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {(result.fractionalKelly * 100).toFixed(1)}% of bankroll
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-[#252a38] bg-[#0d0f12] p-2.5">
                <div className="text-[10px] text-slate-500 mb-0.5">Your edge</div>
                <div className={cn("font-data text-sm font-semibold", edgeColor)}>
                  {result.edge >= 0 ? "+" : ""}{(result.edge * 100).toFixed(1)}pp
                </div>
              </div>
              <div className="rounded border border-[#252a38] bg-[#0d0f12] p-2.5">
                <div className="text-[10px] text-slate-500 mb-0.5">EV per $100</div>
                <div className={cn("font-data text-sm font-semibold",
                  result.ev100 > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {result.ev100 >= 0 ? "+" : ""}${result.ev100.toFixed(2)}
                </div>
              </div>
              <div className="rounded border border-[#252a38] bg-[#0d0f12] p-2.5">
                <div className="text-[10px] text-slate-500 mb-0.5">Full Kelly %</div>
                <div className="font-data text-sm font-semibold text-slate-300">
                  {(result.kelly * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded border border-[#252a38] bg-[#0d0f12] p-2.5">
                <div className="text-[10px] text-slate-500 mb-0.5">Verdict</div>
                <div className={cn("text-xs font-medium",
                  result.edge > 0.05 ? "text-green-400"
                  : result.edge > 0 ? "text-blue-400"
                  : "text-red-400"
                )}>
                  {result.edge > 0.05 ? "Strong buy"
                    : result.edge > 0.02 ? "Buy"
                    : result.edge > 0 ? "Marginal"
                    : "Pass"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-slate-600 text-xs">
            Enter valid probabilities
          </div>
        )}
      </div>
    </div>
  );
}
