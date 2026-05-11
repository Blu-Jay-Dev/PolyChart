"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PortfolioCurve } from "@/components/portfolio/portfolio-curve";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { formatUSD } from "@/lib/utils";
import type { PortfolioSummary } from "@/lib/polymarket/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = async (bypass = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portfolio${bypass ? "?refresh=true" : ""}`
      );
      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("API key")) {
          setError("api_key");
        } else {
          throw new Error(data.error);
        }
        return;
      }
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load portfolio");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    fetchPortfolio(true);
  };

  // Build a mock P&L curve from positions for visualization
  const pnlCurve =
    portfolio && portfolio.positions.length > 0
      ? Array.from({ length: 30 }, (_, i) => ({
          time: Math.floor(Date.now() / 1000) - (29 - i) * 86400,
          value: portfolio.totalUnrealizedPnl * (0.6 + 0.4 * (i / 29)),
        }))
      : [];

  if (error === "api_key") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-8 w-8 text-yellow-400" />
        <div className="text-center">
          <h2 className="text-slate-200 font-semibold mb-1">
            Polymarket API Key Required
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Connect your Polymarket API key to view portfolio data.
            <br />
            Keys are stored encrypted and never exposed to the client.
          </p>
          <Link href="/settings">
            <Button>Configure API Key</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252a38] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-100">Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated positions · read-only
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
          Loading portfolio...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-40 text-red-400 text-sm">
          {error}
        </div>
      ) : portfolio ? (
        <div className="p-6 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Unrealized P&L",
                value: formatUSD(portfolio.totalUnrealizedPnl),
                positive: portfolio.totalUnrealizedPnl >= 0,
                icon:
                  portfolio.totalUnrealizedPnl >= 0 ? TrendingUp : TrendingDown,
              },
              {
                label: "Cost Basis",
                value: formatUSD(portfolio.totalCostBasis),
                positive: true,
                icon: TrendingUp,
              },
              {
                label: "Max Payout",
                value: formatUSD(portfolio.totalMaxPayout),
                positive: true,
                icon: TrendingUp,
              },
              {
                label: "Positions",
                value: portfolio.positions.length.toString(),
                positive: true,
                icon: TrendingUp,
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                <div
                  className={cn(
                    "font-data text-lg font-semibold",
                    stat.label === "Unrealized P&L"
                      ? stat.positive
                        ? "text-green-400"
                        : "text-red-400"
                      : "text-slate-200"
                  )}
                >
                  {stat.value}
                </div>
              </Card>
            ))}
          </div>

          {/* P&L curve */}
          <Card padding="sm">
            <CardHeader>
              <CardTitle>P&L Over Time</CardTitle>
            </CardHeader>
            <PortfolioCurve data={pnlCurve} height={180} />
          </Card>

          {/* Category breakdown */}
          {Object.keys(portfolio.byCategory).length > 0 && (
            <Card padding="sm">
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <div className="flex flex-wrap gap-2">
                {Object.entries(portfolio.byCategory).map(([cat, value]) => (
                  <div
                    key={cat}
                    className="flex items-center gap-2 rounded bg-[#1c2030] border border-[#252a38] px-3 py-2"
                  >
                    <span className="text-xs text-slate-400 capitalize">
                      {cat}
                    </span>
                    <span className="font-data text-sm text-slate-200">
                      {formatUSD(value)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Positions table */}
          <Card padding="none">
            <div className="px-4 py-3 border-b border-[#252a38]">
              <CardTitle>Open Positions</CardTitle>
            </div>
            <PositionsTable positions={portfolio.positions} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
