"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bell,
  BookOpen,
  Briefcase,
  ChevronRight,
  Settings,
  Star,
  TrendingUp,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/markets", label: "Markets", icon: BarChart2 },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const SECONDARY_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 shrink-0 h-screen bg-[#0d0f12] border-r border-[#252a38]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#252a38]">
        <TrendingUp className="h-5 w-5 text-blue-400" />
        <span className="font-semibold text-sm tracking-wide text-slate-100">
          EPISTEME
        </span>
        <ChevronRight className="h-3 w-3 text-slate-600 ml-auto" />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#1c2030]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Secondary nav */}
      <div className="px-2 pb-2 border-t border-[#252a38] pt-2">
        {SECONDARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-sm transition-colors",
                active
                  ? "text-slate-300"
                  : "text-slate-600 hover:text-slate-400 hover:bg-[#1c2030]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-5 w-5",
              },
            }}
          />
          <span className="text-xs text-slate-600">Account</span>
        </div>
      </div>
    </aside>
  );
}
