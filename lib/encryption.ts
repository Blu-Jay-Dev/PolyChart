/**
 * AES-256-GCM encryption for user API keys.
 * ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV for GCM

function getKey(): Promise<CryptoKey> {
  const hexKey = process.env.ENCRYPTION_KEY!;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 chars)");
  }
  const keyBytes = Buffer.from(hexKey, "hex");
  return crypto.subtle.importKey("raw", keyBytes, ALGORITHM, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return Buffer.from(combined).toString("base64");
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(encoded, "base64");

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}
