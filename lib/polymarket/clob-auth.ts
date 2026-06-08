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
  timestamp: number,
  method: string,
  requestPath: string,
  body?: string
): string {
  // Secret is base64url-encoded; decode to raw bytes (convert - → + and _ → /)
  const rawSecret = Buffer.from(
    secret.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
  let message = timestamp + method + requestPath;
  if (body) message += body;
  // Sign → standard base64 → convert to url-safe but KEEP "=" padding (matches TS SDK)
  const b64 = createHmac("sha256", rawSecret)
    .update(message, "utf8")
    .digest("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Build authenticated headers for a CLOB request.
 * @param method   HTTP method
 * @param basePath Path WITHOUT query string (e.g. "/data/trades") — query params
 *                 are excluded from the signature per the py-clob-client reference impl
 * @param body     Request body for POST/DELETE (omit for GET)
 */
export function buildClobHeaders(
  method: "GET" | "POST" | "DELETE",
  basePath: string,
  body?: string
): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000);
  return {
    "Content-Type":    "application/json",
    "POLY_ADDRESS":    ADDRESS,
    "POLY_API_KEY":    API_KEY,
    "POLY_PASSPHRASE": PASSPHRASE,
    "POLY_SIGNATURE":  sign(SECRET, ts, method, basePath, body),
    "POLY_TIMESTAMP":  String(ts),
  };
}
