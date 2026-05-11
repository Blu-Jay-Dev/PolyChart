import Link from "next/link";
import type { UserPosition } from "@/lib/polymarket/types";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PositionsTableProps {
  positions: UserPosition[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-slate-600 text-sm">
        No open positions
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#252a38] text-slate-600 uppercase tracking-wider">
            <th className="text-left py-2 px-3">Market</th>
            <th className="text-right py-2 px-3">Side</th>
            <th className="text-right py-2 px-3">Size</th>
            <th className="text-right py-2 px-3">Avg</th>
            <th className="text-right py-2 px-3">Mark</th>
            <th className="text-right py-2 px-3">Cost</th>
            <th className="text-right py-2 px-3">Max Pay</th>
            <th className="text-right py-2 px-3">Unr P&L</th>
            <th className="text-right py-2 px-3">Impl Ret</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => (
            <tr
              key={`${pos.market}-${i}`}
              className="border-b border-[#252a38]/50 hover:bg-[#141720] transition-colors"
            >
              <td className="py-2 px-3">
                <Link
                  href={`/market/${pos.asset}`}
                  className="text-slate-200 hover:text-blue-400 truncate block max-w-[200px] transition-colors"
                >
                  {pos.market}
                </Link>
                <span className="text-slate-600">{pos.outcome}</span>
              </td>
              <td className="py-2 px-3 text-right">
                <span
                  className={
                    pos.outcome === "Yes" ? "text-green-400" : "text-red-400"
                  }
                >
                  {pos.outcome}
                </span>
              </td>
              <td className="py-2 px-3 text-right font-data text-slate-300">
                {pos.size.toFixed(0)}
              </td>
              <td className="py-2 px-3 text-right font-data text-slate-400">
                {(pos.avgPrice * 100).toFixed(1)}¢
              </td>
              <td className="py-2 px-3 text-right font-data text-slate-300">
                {(pos.currentPrice * 100).toFixed(1)}¢
              </td>
              <td className="py-2 px-3 text-right font-data text-slate-400">
                {formatUSD(pos.costBasis)}
              </td>
              <td className="py-2 px-3 text-right font-data text-slate-300">
                {formatUSD(pos.maxPayout)}
              </td>
              <td className="py-2 px-3 text-right font-data">
                <span
                  className={cn(
                    pos.unrealizedPnl >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {pos.unrealizedPnl >= 0 ? "+" : ""}
                  {formatUSD(pos.unrealizedPnl)}
                </span>
              </td>
              <td className="py-2 px-3 text-right font-data">
                <span
                  className={cn(
                    pos.impliedReturn >= 0 ? "text-green-400" : "text-red-400"
                  )}
                >
                  {(pos.impliedReturn * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
