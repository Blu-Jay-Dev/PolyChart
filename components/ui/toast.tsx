"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { X, Bell, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "info" | "success" | "warning" | "error";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: Omit<Toast, "id">) => {
      const id = String(++counterRef.current);
      setToasts((prev) => [...prev, { ...opts, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const icons: Record<ToastType, typeof Bell> = {
    info: Bell,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
  };

  const colors: Record<ToastType, string> = {
    info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    success: "border-green-500/30 bg-green-500/10 text-green-400",
    warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    error: "border-red-500/30 bg-red-500/10 text-red-400",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg max-w-xs",
                "bg-[#141720]",
                colors[t.type]
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200">
                  {t.title}
                </div>
                {t.message && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-600 hover:text-slate-400 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
