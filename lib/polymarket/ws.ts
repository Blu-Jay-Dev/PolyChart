// WebSocket subscription message types for Polymarket CLOB WS

export type WSMessageType =
  | "subscribe"
  | "unsubscribe"
  | "book"
  | "price_change"
  | "tick_size_change"
  | "last_trade_price";

export interface WSSubscribeMessage {
  type: "subscribe";
  channel: "market";
  markets: string[]; // asset_id / token_id
}

export interface WSBookMessage {
  type: "book";
  asset_id: string;
  market: string;
  timestamp: string;
  hash: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export interface WSPriceChangeMessage {
  type: "price_change";
  asset_id: string;
  changes: Array<{ price: string; side: "BUY" | "SELL"; size: string }>;
  hash: string;
  market: string;
  timestamp: string;
}

export type WSMessage = WSBookMessage | WSPriceChangeMessage | { type: string };
