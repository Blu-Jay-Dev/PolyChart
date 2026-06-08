"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, TrendingDown, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { WalletStat } from "@/app/api/smart-money/route";

const POLY_PROFILE = "https://polymarket.com/profile/";

export default function SmartMoneyPage() {
  const [wallets, setWallets] = useState<WalletStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/smart-money");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setWallets(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const topWallet = wallets[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252a38] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Smart Money Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Top wallets by P&amp;L on recently resolved markets · public on-chain data
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Top 3 cards */}
        {!loading && wallets.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {wallets.slice(0, 3).map((w, i) => (
              <Card key={w.address} className="relative overflow-hidden">
                <div className="absolute top-2 right-3 text-2xl font-bold text-slate-800 select-none">
                  #{i + 1}
                </div>
                <div className="text-xs text-slate-500 mb-1 truncate">{w.pseudonym}</div>
                <div className={cn(
                  "font-data text-xl font-bold",
                  w.totalPnl >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {w.totalPnl >= 0 ? "+" : ""}{formatUSD(w.totalPnl)}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{(w.winRate * 100).toFixed(0)}% win rate</span>
                  <span>{w.tradeCount} trades</span>
                </div>
                <a
                  href={`${POLY_PROFILE}${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline"
                >
                  View profile <ExternalLink className="h-3 w-3" />
                </a>
              </Card>
            ))}
          </div>
        )}

        {/* Full leaderboard */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#252a38] flex items-center justify-between">
            <CardTitle>Leaderboard</CardTitle>
            <span className="text-xs text-slate-600">Based on last 20 resolved markets</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
              Computing P&amp;L across resolved markets…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-red-400 text-sm">{error}</div>
          ) : wallets.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
              No data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#252a38] text-slate-600 uppercase tracking-wider">
                    <th className="text-left py-2 px-4 w-8">#</th>
                    <th className="text-left py-2 px-4">Trader</th>
                    <th className="text-right py-2 px-4">P&amp;L</th>
                    <th className="text-right py-2 px-4">Staked</th>
                    <th className="text-right py-2 px-4">Win Rate</th>
                    <th className="text-right py-2 px-4">Trades</th>
                    <th className="text-right py-2 px-4">Best Market</th>
                    <th className="py-2 px-4 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w, i) => (
                    <tr
                      key={w.address}
                      className="border-b border-[#252a38]/50 hover:bg-[#141720] transition-colors"
                    >
                      <td className="py-2.5 px-4 text-slate-600">{i + 1}</td>
                      <td className="py-2.5 px-4">
                        <div className="text-slate-200 font-medium">{w.pseudonym}</div>
                        <div className="text-slate-600 font-mono">{w.address.slice(0, 10)}…</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-data">
                        <span className={w.totalPnl >= 0 ? "text-green-400" : "text-red-400"}>
                          {w.totalPnl >= 0 ? "+" : ""}{formatUSD(w.totalPnl)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-data text-slate-400">
                        {formatUSD(w.totalStaked)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {w.winRate >= 0.5
                            ? <TrendingUp className="h-3 w-3 text-green-400" />
                            : <TrendingDown className="h-3 w-3 text-red-400" />}
                          <span className={w.winRate >= 0.5 ? "text-green-400" : "text-red-400"}>
                            {(w.winRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-data text-slate-400">
                        {w.tradeCount}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 max-w-[200px] truncate">
                        {w.topMarket}
                      </td>
                      <td className="py-2.5 px-4">
                        <a
                          href={`${POLY_PROFILE}${w.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-blue-400 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-700 text-center">
          P&amp;L estimated from buy-side trades on resolved markets. Does not account for partial exits or market-making activity.
        </p>
      </div>
    </div>
  );
}
