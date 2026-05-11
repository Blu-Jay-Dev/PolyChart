"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Trash2, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertForm } from "@/components/alerts/alert-form";
import type { Alert } from "@/lib/polymarket/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const deleteAlert = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const conditionLabel = (cond: string, threshold: number) => {
    const pct = (threshold * 100).toFixed(0);
    switch (cond) {
      case "price_above":
        return `Price > ${pct}%`;
      case "price_below":
        return `Price < ${pct}%`;
      case "spread_above":
        return `Spread > ${(threshold * 100).toFixed(2)}¢`;
      case "volume_spike":
        return `Volume spike`;
      default:
        return cond;
    }
  };

  const active = alerts.filter((a) => a.active);
  const triggered = alerts.filter((a) => !a.active && a.triggered_at);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252a38] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-slate-100">Alerts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conditional price and market alerts
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          New Alert
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* New alert form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create Alert</CardTitle>
            </CardHeader>
            <AlertForm
              onCreated={() => {
                setShowForm(false);
                fetchAlerts();
              }}
            />
          </Card>
        )}

        {/* Active alerts */}
        <Card padding="none">
          <div className="px-4 py-3 border-b border-[#252a38] flex items-center justify-between">
            <CardTitle>Active Alerts</CardTitle>
            <Badge variant="blue">{active.length}</Badge>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-slate-600">Loading...</div>
          ) : active.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center gap-2 text-slate-600">
              <Bell className="h-6 w-6" />
              <span className="text-sm">No active alerts</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                Create your first alert
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#252a38]">
              {active.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#141720] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 truncate max-w-sm">
                      {alert.market_title ?? alert.token_id}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-data">
                        {conditionLabel(alert.condition_type, alert.threshold)}
                      </span>
                      <Badge
                        variant={
                          alert.delivery === "email"
                            ? "blue"
                            : alert.delivery === "both"
                            ? "purple"
                            : "default"
                        }
                      >
                        {alert.delivery}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors ml-4 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Triggered history */}
        {triggered.length > 0 && (
          <Card padding="none">
            <div className="px-4 py-3 border-b border-[#252a38]">
              <CardTitle>Triggered History</CardTitle>
            </div>
            <div className="divide-y divide-[#252a38]">
              {triggered.slice(0, 20).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between px-4 py-3 opacity-60"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-300 truncate max-w-sm">
                      {alert.market_title ?? alert.token_id}
                    </div>
                    <div className="text-xs text-slate-500 font-data mt-0.5">
                      {conditionLabel(alert.condition_type, alert.threshold)} ·
                      Fired{" "}
                      {alert.triggered_at
                        ? new Date(alert.triggered_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                  <Badge variant="green">Fired</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
