"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { MarketSparkline } from "@/components/charts/market-sparkline";

const LS_KEY = "poly_watchlist";

interface WatchlistItem {
  market_id: string;
  market_title: string | null;
  added_at: string;
}

function loadLocalItems(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchlistItem[];
  } catch {
    return [];
  }
}

function saveLocalItems(items: WatchlistItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {}
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show localStorage items instantly while API loads
    setItems(loadLocalItems());

    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
          saveLocalItems(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = async (marketId: string) => {
    const next = items.filter((i) => i.market_id !== marketId);
    setItems(next);
    saveLocalItems(next);
    fetch(`/api/watchlist?market_id=${marketId}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="border-b border-[#252a38] px-6 py-4">
        <h1 className="text-base font-semibold text-slate-100">Watchlist</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your starred markets · {items.length} saved
        </p>
      </div>

      <div className="p-6">
        {loading && items.length === 0 ? (
          <div className="text-slate-600 text-sm">Loading...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-600">
            <Star className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm mb-1">No markets in watchlist</p>
              <p className="text-xs">
                Star markets in the{" "}
                <Link href="/markets" className="text-blue-400 hover:underline">
                  market browser
                </Link>{" "}
                to add them here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {items.map((item) => (
              <div
                key={item.market_id}
                className="flex items-center gap-4 rounded-lg border border-[#252a38] bg-[#141720] px-4 py-3 hover:border-[#363d52] transition-colors group"
              >
                <Link
                  href={`/market/${item.market_id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="text-sm text-slate-200 truncate hover:text-blue-400 transition-colors">
                    {item.market_title ?? item.market_id}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Added {new Date(item.added_at).toLocaleDateString()}
                  </div>
                </Link>
                <MarketSparkline tokenId={item.market_id} width={60} height={24} />
                <button
                  onClick={() => remove(item.market_id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
