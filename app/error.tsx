"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d0f12] flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-8 w-8 text-yellow-400" />
      <div className="text-center">
        <h1 className="text-slate-100 font-semibold text-lg mb-1">
          Something went wrong
        </h1>
        <p className="text-slate-500 text-sm mb-4">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={() => reset()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}
