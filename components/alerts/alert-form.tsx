"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AlertCondition, AlertDelivery } from "@/lib/polymarket/types";

interface WatchlistItem {
  market_id: string;
  market_title: string;
}

interface AlertFormProps {
  onCreated: () => void;
}

export function AlertForm({ onCreated }: AlertFormProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [tokenId, setTokenId] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("price_above");
  const [threshold, setThreshold] = useState("0.7");
  const [delivery, setDelivery] = useState<AlertDelivery>("in_app");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWatchlist(data);
          if (data.length > 0) setTokenId(data[0].market_id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const market = watchlist.find((w) => w.market_id === tokenId);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: tokenId,
          market_title: market?.market_title,
          condition_type: condition,
          threshold: parseFloat(threshold),
          delivery,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create alert");
        return;
      }

      onCreated();
      setThreshold("0.7");
    } catch {
      setError("Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  const conditionLabels: Record<AlertCondition, string> = {
    price_above: "Price goes above",
    price_below: "Price goes below",
    spread_above: "Spread exceeds",
    volume_spike: "Volume spike",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Market</label>
        {watchlist.length === 0 ? (
          <p className="text-xs text-slate-600">
            Add markets to your watchlist first
          </p>
        ) : (
          <Select
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="w-full"
          >
            {watchlist.map((w) => (
              <option key={w.market_id} value={w.market_id}>
                {w.market_title?.slice(0, 60) ?? w.market_id}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Condition</label>
          <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value as AlertCondition)}
            className="w-full"
          >
            {(Object.keys(conditionLabels) as AlertCondition[]).map((k) => (
              <option key={k} value={k}>
                {conditionLabels[k]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">
            Threshold (0–1)
          </label>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="0.70"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">Delivery</label>
        <Select
          value={delivery}
          onChange={(e) => setDelivery(e.target.value as AlertDelivery)}
          className="w-full"
        >
          <option value="in_app">In-app only</option>
          <option value="email">Email</option>
          <option value="both">In-app + Email</option>
        </Select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button type="submit" disabled={loading || !tokenId} className="w-full">
        {loading ? "Creating..." : "Create Alert"}
      </Button>
    </form>
  );
}
