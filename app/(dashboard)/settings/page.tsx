import { Suspense } from "react";
import { SettingsContent } from "./settings-content";

export const metadata = {
  title: "Settings — Episteme",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600 text-sm">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
