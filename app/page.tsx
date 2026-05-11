import Link from "next/link";
import {
  TrendingUp,
  BarChart2,
  BookOpen,
  Briefcase,
  Bell,
  Shield,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-200">
      {/* Nav */}
      <header className="border-b border-[#252a38] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="font-semibold tracking-wide">EPISTEME</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/markets"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Markets
          </Link>
          <Link
            href="/about"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            About
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-24 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live on Polymarket
        </div>

        <h1 className="text-5xl font-bold text-slate-100 leading-tight mb-6">
          TradingView for
          <br />
          <span className="text-blue-400">Polymarket</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Professional charting and analytics for prediction market traders.
          OHLC candlestick charts, real-time order book depth, portfolio P&amp;L,
          and smart conditional alerts — the analytical layer Polymarket
          can&apos;t build for you.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-3 text-base font-medium text-white transition-colors"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 rounded-lg border border-[#252a38] bg-[#141720] hover:bg-[#1c2030] px-6 py-3 text-base font-medium text-slate-300 transition-colors"
          >
            Browse markets
          </Link>
        </div>
      </section>

      {/* Problem/Solution table */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <h2 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
          What traders need vs. what Polymarket gives
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#252a38]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#252a38] bg-[#0a0c0f]">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">
                  Feature
                </th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">
                  Polymarket Native
                </th>
                <th className="text-center px-4 py-3 text-blue-400 font-medium">
                  Episteme
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#141720]">
              {[
                [
                  "OHLC candlestick price history",
                  "Single price line",
                  "Full 1H/4H/1D/1W charts",
                ],
                [
                  "Order book depth visualization",
                  "Best bid/ask only",
                  "Full depth ladder + chart",
                ],
                [
                  "Portfolio P&L curve",
                  "Flat position list",
                  "Aggregate P&L over time",
                ],
                [
                  "Spread & slippage metrics",
                  "Not exposed",
                  "Per trade size estimates",
                ],
                [
                  "Conditional price alerts",
                  "Basic push only",
                  "50 alerts + email delivery",
                ],
                [
                  "Cross-market correlation",
                  "Not available",
                  "Coming soon",
                ],
              ].map(([feature, native, episteme]) => (
                <tr
                  key={feature}
                  className="border-b border-[#252a38]/50 hover:bg-[#1c2030] transition-colors"
                >
                  <td className="px-4 py-3 text-slate-300">{feature}</td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {native}
                  </td>
                  <td className="px-4 py-3 text-center text-green-400 font-medium">
                    {episteme}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: BarChart2,
              title: "OHLC Candlestick Charts",
              desc: "Constructed from raw trade data. 1H, 4H, 1D, 1W timeframes with SMA overlays and volume histogram.",
            },
            {
              icon: BookOpen,
              title: "Real-time Order Book",
              desc: "Full CLOB depth via WebSocket. Bid/ask depth ladder, cumulative depth chart, spread and slippage calculator.",
            },
            {
              icon: Briefcase,
              title: "Portfolio Dashboard",
              desc: "Aggregate all open positions into a single P&L curve. Per-position unrealized P&L, cost basis, and max payout.",
            },
            {
              icon: Bell,
              title: "Smart Alerts",
              desc: "Conditional alerts when markets move. Price above/below, spread exceeds, volume spike. In-app and email delivery.",
            },
            {
              icon: Shield,
              title: "Read-only & Secure",
              desc: "Polymarket API keys encrypted with AES-256. Never stored in plaintext. No trading is executed from Episteme.",
            },
            {
              icon: TrendingUp,
              title: "Built for Traders",
              desc: "Dark terminal aesthetic. IBM Plex Mono for data. Designed for people who make 50–500 trades a month.",
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-lg border border-[#252a38] bg-[#141720] p-4"
              >
                <Icon className="h-5 w-5 text-blue-400 mb-3" />
                <h3 className="font-semibold text-slate-100 mb-1 text-sm">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-8 pb-24">
        <h2 className="text-center text-2xl font-bold text-slate-100 mb-3">
          Simple pricing
        </h2>
        <p className="text-center text-slate-500 text-sm mb-10">
          Start free. Upgrade when you need more.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-lg border border-[#252a38] bg-[#141720] p-6">
            <div className="text-lg font-semibold text-slate-100 mb-1">
              Free
            </div>
            <div className="text-3xl font-bold text-slate-100 mb-1">$0</div>
            <p className="text-xs text-slate-500 mb-5">Forever free</p>
            <ul className="space-y-2 text-sm text-slate-400 mb-6">
              {[
                "5 watchlist markets",
                "7-day chart history",
                "Top 5 order book levels",
                "2 price alerts",
                "Market browser",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center rounded border border-[#252a38] bg-[#1c2030] hover:bg-[#252a38] px-4 py-2 text-sm text-slate-300 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-lg border border-blue-500/40 bg-blue-600/5 p-6 relative">
            <div className="absolute -top-3 left-4">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                Popular
              </span>
            </div>
            <div className="text-lg font-semibold text-slate-100 mb-1">Pro</div>
            <div className="text-3xl font-bold text-slate-100 mb-1">$12</div>
            <p className="text-xs text-slate-500 mb-5">per month</p>
            <ul className="space-y-2 text-sm text-slate-300 mb-6">
              {[
                "Unlimited watchlist markets",
                "Full chart history",
                "Full order book depth + depth chart",
                "Portfolio dashboard",
                "50 alerts + email delivery",
                "Slippage calculator",
                "5-minute OHLC refresh",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm text-white font-medium transition-colors"
            >
              Start with Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#252a38] px-8 py-6 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-700" />
          <span>Episteme · Not financial advice</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-slate-400 transition-colors">
            About
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-400 transition-colors"
          >
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
