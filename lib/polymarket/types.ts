// Polymarket API type definitions

export interface Market {
  id: string;
  question: string;
  description: string;
  category: string;
  slug: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  volume24hr: number;
  competitive: number;
  createdAt: string;
  updatedAt: string;
  // Gamma API returns these as JSON strings (parse before use)
  clobTokenIds?: string; // JSON string: ["tokenId1", "tokenId2"]
  outcomes?: string;     // JSON string: ["Yes", "No"] or ["Up", "Down"]
  // Pricing fields from Gamma API
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  oneDayPriceChange?: number;
  oneWeekPriceChange?: number;
  // Legacy tokens field (not returned by Gamma API, kept for compatibility)
  tokens?: MarketToken[];
  resolutionSource?: string;
  resolutionDate?: string;
  clearBookOnClose?: boolean;
  tags?: string[];
}

export interface MarketToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  markets: Market[];
  volume: number;
  liquidity: number;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
}

export interface PriceLevel {
  price: string;
  size: string;
}

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  bucket_index: number;
  owner: string;
  maker_address: string;
  transaction_hash: string;
  trader_side: "TAKER" | "MAKER";
  type: "TRADE";
}

export interface OHLCBar {
  time: number; // unix seconds — lightweight-charts format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SpreadInfo {
  bid: number;
  ask: number;
  spread: number;
  mid: number;
}

export interface SlippageResult {
  tradeSize: number;
  estimatedPrice: number;
  slippagePct: number;
  fills: Array<{ price: number; size: number }>;
}

export interface UserPosition {
  market: string;
  asset: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  costBasis: number;
  maxPayout: number;
  impliedReturn: number;
}

export interface PortfolioSummary {
  totalUnrealizedPnl: number;
  totalCostBasis: number;
  totalMaxPayout: number;
  positions: UserPosition[];
  byCategory: Record<string, number>;
}

export type AlertCondition =
  | "price_above"
  | "price_below"
  | "spread_above"
  | "volume_spike";

export type AlertDelivery = "in_app" | "email" | "both";

export interface Alert {
  id: string;
  user_id: string;
  token_id: string;
  market_title?: string;
  condition_type: AlertCondition;
  threshold: number;
  delivery: AlertDelivery;
  active: boolean;
  triggered_at?: string;
  created_at: string;
}

export type TimeFrame = "1H" | "4H" | "1D" | "1W";

export const TIMEFRAME_MS: Record<TimeFrame, number> = {
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
};
