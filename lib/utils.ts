import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, decimals = 3): string {
  return (price * 100).toFixed(1) + "%";
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return formatUSD(volume);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Resolved";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)}mo`;
  return `${Math.ceil(diffDays / 365)}y`;
}

export function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    politics: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    crypto: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    sports: "bg-green-500/20 text-green-400 border-green-500/30",
    macro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    tech: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    science: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  return (
    colors[category?.toLowerCase()] ??
    "bg-gray-500/20 text-gray-400 border-gray-500/30"
  );
}
