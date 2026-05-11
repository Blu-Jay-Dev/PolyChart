import Link from "next/link";
import { ArrowLeft, TrendingUp, Shield, Zap, BookOpen } from "lucide-react";

export const metadata = {
  title: "About — Episteme",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0d0f12] text-slate-200">
      {/* Nav */}
      <header className="border-b border-[#252a38] px-8 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="font-semibold tracking-wide">EPISTEME</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          About Episteme
        </h1>
        <p className="text-slate-400 leading-relaxed mb-8">
          Episteme is a professional charting and analytics terminal built
          exclusively on top of the{" "}
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Polymarket
          </a>{" "}
          API. It gives active traders the analytical layer that
          Polymarket&apos;s own interface structurally cannot prioritize —
          real price history, order book depth, portfolio aggregation, and
          market intelligence.
        </p>

        <div className="space-y-6 mb-12">
          {[
            {
              icon: TrendingUp,
              title: "TradingView for Polymarket",
              body: "TradingView didn't build a brokerage. It built the analytical layer above the brokerage. Episteme is to Polymarket what TradingView is to exchanges — a tool the exchange itself has no incentive to build.",
            },
            {
              icon: Shield,
              title: "Security-first",
              body: "Your Polymarket API key is encrypted with AES-256-GCM before storage. It is decrypted server-side only at request time and never transmitted to the browser. Keys grant read-only access — no trading is executed from Episteme.",
            },
            {
              icon: Zap,
              title: "Built on public APIs",
              body: "All data comes from Polymarket's public Gamma API, CLOB REST API, WebSocket feeds, and Data API. Episteme adds caching (Redis), persistence (Supabase), and real-time relay (Server-Sent Events) on top of these public feeds.",
            },
            {
              icon: BookOpen,
              title: "Not financial advice",
              body: "Episteme displays analytical data and market information. It does not provide financial or investment advice, does not route orders, and does not hold user funds. Trading prediction markets carries risk. All information may be inaccurate.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-lg border border-[#252a38] bg-[#141720] p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-blue-400" />
                  <h2 className="font-semibold text-slate-100">{item.title}</h2>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#252a38] pt-8 text-sm text-slate-500 space-y-1">
          <p>Episteme v1.0 · May 2026</p>
          <p>Built with Next.js, Supabase, Clerk, Stripe, and Resend.</p>
          <p>
            Data sourced from Polymarket&apos;s public API. Not affiliated with
            Polymarket.
          </p>
        </div>
      </div>
    </div>
  );
}
