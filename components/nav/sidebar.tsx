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
  User,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const hasClerkKeys =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

const NAV_ITEMS = [
  { href: "/markets", label: "Markets", icon: BarChart2 },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

const ALPHA_ITEMS = [
  { href: "/smart-money", label: "Smart Money", icon: Users,  badge: "NEW" },
  { href: "/calibration", label: "Calibration",  icon: Target, badge: "NEW" },
  { href: "/arbitrage",   label: "Arbitrage",    icon: Zap,    badge: "NEW" },
];

const SECONDARY_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about",    label: "About",    icon: BookOpen  },
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
      <nav className="flex flex-col gap-0.5 px-2 py-3">
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

      {/* Edge tools section */}
      <div className="px-2 border-t border-[#252a38] pt-2">
        <div className="px-2.5 py-1 text-[10px] text-slate-700 uppercase tracking-widest">
          Edge Tools
        </div>
        {ALPHA_ITEMS.map((item) => {
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
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#1c2030]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && !active && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Secondary nav */}
      <div className="mt-auto px-2 pb-2 border-t border-[#252a38] pt-2">
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
          {hasClerkKeys ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-5 w-5",
                },
              }}
            />
          ) : (
            <User className="h-5 w-5 text-slate-600" />
          )}
          <span className="text-xs text-slate-600">Account</span>
        </div>
      </div>
    </aside>
  );
}
