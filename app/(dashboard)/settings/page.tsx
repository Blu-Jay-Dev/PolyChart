"use client";

import { useEffect, useState } from "react";
import { Key, CreditCard, Check, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const upgradeStatus = searchParams.get("upgrade");

  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState(false);

  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [billingLoading, setBillingLoading] = useState(false);

  // Load key status and user plan
  useEffect(() => {
    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((data) => {
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      })
      .catch(() => {});
  }, []);

  const saveApiKey = async () => {
    setSavingKey(true);
    setKeyError("");
    setKeySuccess(false);
    try {
      const res = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        setKeyError(data.error ?? "Failed to save key");
        return;
      }
      setHasKey(true);
      setMaskedKey(apiKey.slice(0, 6) + "••••••••" + apiKey.slice(-4));
      setApiKey("");
      setKeySuccess(true);
    } catch {
      setKeyError("Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

  const removeApiKey = async () => {
    await fetch("/api/settings/api-key", { method: "DELETE" });
    setHasKey(false);
    setMaskedKey(null);
  };

  const handleUpgrade = async () => {
    setBillingLoading(true);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_checkout" }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setBillingLoading(false);
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_portal" }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setBillingLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="border-b border-[#252a38] px-6 py-4">
        <h1 className="text-base font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          API key, billing, and preferences
        </p>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
        {/* Upgrade success banner */}
        {upgradeStatus === "success" && (
          <div className="flex items-center gap-2 rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <Check className="h-4 w-4" />
            You&apos;ve successfully upgraded to Pro. Welcome!
          </div>
        )}

        {/* Polymarket API Key */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                Polymarket API Key
              </span>
            </CardTitle>
          </CardHeader>

          <p className="text-xs text-slate-500 mb-3">
            Required for portfolio data. Your key is encrypted with AES-256 and
            never exposed to the browser. Read-only access only.
          </p>

          {hasKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm">
                <Check className="h-4 w-4 text-green-400" />
                <span className="font-data text-slate-300">{maskedKey}</span>
              </div>
              <Button variant="danger" size="sm" onClick={removeApiKey}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove Key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Paste your Polymarket API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {keyError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {keyError}
                </div>
              )}
              {keySuccess && (
                <p className="text-xs text-green-400">
                  API key saved successfully
                </p>
              )}
              <Button
                onClick={saveApiKey}
                disabled={savingKey || !apiKey.trim()}
              >
                {savingKey ? "Validating..." : "Save API Key"}
              </Button>
              <p className="text-xs text-slate-600">
                Find your API key in Polymarket settings → API.
              </p>
            </div>
          )}
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Subscription
              </span>
            </CardTitle>
          </CardHeader>

          <div className="flex items-center gap-3 mb-4">
            <Badge variant={plan === "pro" ? "purple" : "default"}>
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
            <span className="text-xs text-slate-500">
              {plan === "pro"
                ? "Full access to all features"
                : "Limited to 5 watchlist markets, 2 alerts"}
            </span>
          </div>

          {plan === "free" ? (
            <div className="space-y-3">
              <div className="rounded border border-[#252a38] p-3 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 mb-2">
                  Pro · $12/mo
                </div>
                {[
                  "Unlimited watchlist markets",
                  "Full chart history",
                  "Full order book depth",
                  "Portfolio dashboard",
                  "50 alerts + email delivery",
                  "Slippage calculator",
                  "5-minute OHLC refresh",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-green-400" />
                    {f}
                  </div>
                ))}
              </div>
              <Button onClick={handleUpgrade} disabled={billingLoading}>
                {billingLoading ? "Redirecting..." : "Upgrade to Pro"}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={handleManageBilling}
              disabled={billingLoading}
            >
              {billingLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
