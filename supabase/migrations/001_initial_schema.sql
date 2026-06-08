-- Episteme initial schema
-- Run in Supabase SQL editor or via supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (synced from Clerk webhook)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  poly_api_key_enc TEXT, -- AES-256-GCM encrypted Polymarket API key
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL, -- Polymarket token_id (clobTokenId)
  market_title TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, market_id)
);

-- Market metadata cache (server-side, no RLS needed)
CREATE TABLE IF NOT EXISTS market_cache (
  token_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  yes_price NUMERIC(10,6),
  volume_24h NUMERIC(20,2),
  volume_total NUMERIC(20,2),
  metadata_json JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily OHLC bars
CREATE TABLE IF NOT EXISTS ohlc_1d (
  token_id TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(10,6) NOT NULL,
  high NUMERIC(10,6) NOT NULL,
  low NUMERIC(10,6) NOT NULL,
  close NUMERIC(10,6) NOT NULL,
  volume NUMERIC(20,2) NOT NULL DEFAULT 0,
  constructed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (token_id, date)
);
CREATE INDEX IF NOT EXISTS idx_ohlc_1d_token ON ohlc_1d(token_id, date DESC);

-- Hourly OHLC bars
CREATE TABLE IF NOT EXISTS ohlc_1h (
  token_id TEXT NOT NULL,
  hour_ts TIMESTAMPTZ NOT NULL,
  open NUMERIC(10,6) NOT NULL,
  high NUMERIC(10,6) NOT NULL,
  low NUMERIC(10,6) NOT NULL,
  close NUMERIC(10,6) NOT NULL,
  volume NUMERIC(20,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (token_id, hour_ts)
);
CREATE INDEX IF NOT EXISTS idx_ohlc_1h_token ON ohlc_1h(token_id, hour_ts DESC);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id TEXT NOT NULL,
  market_title TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('price_above', 'price_below', 'spread_above', 'volume_spike')),
  threshold NUMERIC(10,6) NOT NULL,
  delivery TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery IN ('in_app', 'email', 'both')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_at_trigger NUMERIC(10,6),
  delivery_status TEXT DEFAULT 'pending'
);

-- API usage log (for rate limit monitoring)
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  calls_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses these)
-- Users can only read/write their own data
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid()::text = clerk_id);

CREATE POLICY "watchlists_own_data" ON watchlists
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "alerts_own_data" ON alerts
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

CREATE POLICY "alert_history_own_data" ON alert_history
  FOR ALL USING (
    alert_id IN (
      SELECT a.id FROM alerts a
      JOIN users u ON a.user_id = u.id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
