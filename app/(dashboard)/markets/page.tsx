import { Suspense } from "react";
import { MarketBrowser } from "./market-browser";
import { TableRowSkeleton } from "@/components/ui/loading-skeleton";

export const metadata = {
  title: "Markets — Episteme",
};

export default function MarketsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#252a38] px-6 py-4">
        <h1 className="text-base font-semibold text-slate-100">Markets</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Browse all live Polymarket prediction markets
        </p>
      </div>
      <Suspense
        fallback={
          <div className="p-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}
          </div>
        }
      >
        <MarketBrowser />
      </Suspense>
    </div>
  );
}
