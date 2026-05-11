import { Suspense } from "react";
import { getMarket } from "@/lib/polymarket/gamma";
import { CandleChart } from "@/components/charts/candle-chart";
import { OrderBook } from "@/components/orderbook/order-book";
import { TradesFeed } from "@/components/orderbook/trades-feed";
import { DepthChart } from "@/components/charts/depth-chart";
import { MarketHeader } from "./market-header";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const market = await getMarket(id);
    return { title: `${market.question} — Episteme` };
  } catch {
    return { title: "Market — Episteme" };
  }
}

export default async function MarketPage({ params }: PageProps) {
  const { id } = await params;

  let market;
  try {
    market = await getMarket(id);
  } catch {
    notFound();
  }

  const yesToken =
    market.tokens?.find((t) => t.outcome === "Yes") ?? market.tokens?.[0];
  const tokenId = yesToken?.token_id ?? id;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Market header */}
      <MarketHeader market={market} tokenId={tokenId} />

      {/* Main layout: chart + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart area */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#252a38]">
          <Suspense fallback={<ChartSkeleton />}>
            <CandleChart tokenId={tokenId} title={market.question} />
          </Suspense>
        </div>

        {/* Right sidebar: order book, depth chart, trades */}
        <div className="w-72 flex flex-col shrink-0 overflow-hidden">
          {/* Order book */}
          <div className="flex-1 border-b border-[#252a38] p-3 overflow-auto flex flex-col">
            <div className="text-xs text-slate-600 uppercase tracking-wider mb-2">
              Order Book
            </div>
            <Suspense
              fallback={
                <div className="text-xs text-slate-600">Loading...</div>
              }
            >
              <OrderBook tokenId={tokenId} />
            </Suspense>
          </div>

          {/* Depth chart */}
          <div className="h-40 border-b border-[#252a38] p-3 flex flex-col overflow-hidden">
            <DepthChart tokenId={tokenId} />
          </div>

          {/* Trades feed */}
          <div className="h-44 p-3 overflow-hidden flex flex-col">
            <TradesFeed tokenId={tokenId} />
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t border-[#252a38] px-4 py-1.5 text-xs text-slate-700 bg-[#0a0c0f]">
        Not financial advice. Episteme provides analytical data only.
        Predictions may be incorrect.
      </div>
    </div>
  );
}
