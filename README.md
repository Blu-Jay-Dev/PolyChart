# Episteme — Polymarket Analytics Terminal

> TradingView for Polymarket. Professional charting, order book depth, portfolio analytics, and smart alerts — built on Polymarket's public APIs.

## Features

- **OHLC Candlestick Charts** — 1H/4H/1D/1W timeframes with SMA overlays and volume histogram
- **Real-time Order Book** — Full CLOB depth via WebSocket, bid/ask ladder, depth chart
- **Slippage Calculator** — Estimate execution price for $100–$5K trade sizes
- **Portfolio Dashboard** — Aggregate P&L curve, per-position cost basis and max payout
- **Smart Alerts** — Conditional price/spread alerts with in-app and email delivery
- **Market Browser** — Search, filter by category, sort by volume/liquidity
- **Watchlist** — Star markets for tracking and OHLC data collection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Charting | lightweight-charts (TradingView OSS) |
| Database | Supabase (Postgres + RLS) |
| Auth | Clerk |
| Payments | Stripe |
| Email | Resend |
| Cache | Redis (Upstash) |
| Deployment | Vercel |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Blu-Jay-Dev/PolyChart.git
cd PolyChart
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

Required services:
- **Clerk** — clerk.com (auth)
- **Supabase** — supabase.com (database)
- **Upstash** — upstash.com (Redis cache)
- **Stripe** — stripe.com (billing)
- **Resend** — resend.com (email alerts)

Generate the encryption key:
```bash
openssl rand -hex 32
```

### 3. Database

Run the migration in your Supabase SQL editor:
```
supabase/migrations/001_initial_schema.sql
```

### 4. Clerk webhooks

In Clerk dashboard → Webhooks, point `user.created` and `user.updated` to:
```
https://your-domain.com/api/webhooks/clerk
```

### 5. Stripe

Create a product with a $12/month price in Stripe, copy the Price ID to `STRIPE_PRO_PRICE_ID`. Point the webhook to:
```
https://your-domain.com/api/webhooks/stripe
```

Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

### 6. Run locally

```bash
npm run dev
```

## Deployment

Deploy to Vercel. The `vercel.json` configures two cron jobs:

- `/api/cron/build-ohlc` — every 5 minutes, builds OHLC data for watchlisted markets
- `/api/alerts/eval` — every minute, evaluates active alerts against cached prices

Set all environment variables in the Vercel dashboard.

## Architecture

```
Client (Browser)
  Chart / OrderBook / Portfolio / Alerts UI
       ↕  SSE (real-time via /api/ws-proxy)
       ↕  REST (market data / user data)
Next.js API Routes + Edge Functions (Vercel)
  ├── /api/markets         → Gamma API (cached 60s in Redis)
  ├── /api/orderbook/:id   → CLOB REST (cached 5s in Redis)
  ├── /api/ohlc/:id        → Supabase (built from trade history)
  ├── /api/portfolio       → Data API (user key, encrypted)
  ├── /api/ws-proxy        → Polymarket WS relay via SSE
  └── /api/alerts/eval     → Alert evaluation cron
External Services
  Polymarket (Gamma, CLOB, Data, WS)  |  Supabase  |  Redis (Upstash)
  Clerk (auth)  |  Stripe (billing)  |  Resend (alerts)
```

## Security

- User Polymarket API keys encrypted with AES-256-GCM before storage
- Keys decrypted server-side only at request time
- Keys never transmitted to the browser
- Supabase Row Level Security on all user-scoped tables
- Clerk webhook signature verification (svix)
- Stripe webhook signature verification

## Disclaimer

Episteme displays analytical data only. It does not provide financial advice, route orders, or hold user funds. Trading prediction markets carries risk.

---

*Episteme v1.0 · May 2026*
