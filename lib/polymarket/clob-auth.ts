/**
 * Polymarket CLOB API authentication.
 *
 * Credentials are obtained by signing an EIP-712 message with your Polymarket
 * wallet at https://polymarket.com. Add them to .env.local:
 *
 *   POLY_API_KEY=<key>
 *   POLY_SECRET=<base64url-encoded secret>
 *   POLY_PASSPHRASE=<passphrase>
 *   POLY_ADDRESS=<0x wallet address>
 *
 * Signing algorithm (from py-clob-client):
 *   message   = timestamp + METHOD + requestPath [+ body]
 *   signature = base64url( HMAC-SHA256( base64url_decode(secret), message ) )
 */

import { createHmac } from "crypto";

const API_KEY    = process.env.POLY_API_KEY    ?? "";
const SECRET     = process.env.POLY_SECRET     ?? "";
const PASSPHRASE = process.env.POLY_PASSPHRASE ?? "";
const ADDRESS    = process.env.POLY_ADDRESS    ?? "";

export const HAS_CLOB_AUTH =
  API_KEY.length > 0 &&
  SECRET.length > 0 &&
  PASSPHRASE.length > 0 &&
  ADDRESS.length > 0 &&
  !API_KEY.includes("placeholder");

function sign(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body?: string
): string {
  const rawSecret = Buffer.from(secret, "base64url");
  let message = timestamp + method + requestPath;
  if (body) message += body.replace(/'/g, '"');
  return createHmac("sha256", rawSecret)
    .update(message, "utf8")
    .digest("base64url");
}

export function buildClobHeaders(
  method: "GET" | "POST" | "DELETE",
  requestPath: string, // path + query string, e.g. "/data/trades?asset_id=..."
  body?: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return {
    "Content-Type":   "application/json",
    "poly-address":   ADDRESS,
    "poly-api-key":   API_KEY,
    "poly-passphrase":PASSPHRASE,
    "poly-signature": sign(SECRET, timestamp, method, requestPath, body),
    "poly-timestamp": timestamp,
  };
}
