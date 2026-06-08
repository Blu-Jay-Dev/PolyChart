"""
Generate Polymarket CLOB API credentials from an Ethereum private key.

Usage:
    python scripts/get-clob-creds.py

You will be prompted for your private key (input is hidden).
Credentials are written directly to .env.local.
"""

import getpass
import sys
import re
from pathlib import Path

HOST   = "https://clob.polymarket.com"
CHAIN  = 137  # Polygon mainnet

def main():
    print("Polymarket CLOB credential generator")
    print("=" * 40)
    print("This derives API credentials by signing a message with your wallet.")
    print("Your private key is never stored or transmitted.\n")

    pk = getpass.getpass("Private key (0x...): ").strip()
    if not pk.startswith("0x"):
        pk = "0x" + pk

    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds
    except ImportError:
        print("ERROR: py-clob-client not installed. Run: pip install py-clob-client")
        sys.exit(1)

    print("\nConnecting to CLOB API...")
    try:
        client = ClobClient(HOST, key=pk, chain_id=CHAIN)
        creds: ApiCreds = client.create_or_derive_api_creds()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    address  = client.get_address()
    api_key  = creds.api_key
    secret   = creds.api_secret
    passphrase = creds.api_passphrase

    print(f"\nAddress:    {address}")
    print(f"API Key:    {api_key}")
    print(f"Secret:     {secret[:8]}... (truncated)")
    print(f"Passphrase: {passphrase[:4]}... (truncated)")

    # Write to .env.local
    env_path = Path(__file__).parent.parent / ".env.local"
    env_text = env_path.read_text(encoding="utf-8") if env_path.exists() else ""

    def replace_or_append(text: str, key: str, value: str) -> str:
        pattern = rf"^{re.escape(key)}=.*$"
        replacement = f"{key}={value}"
        if re.search(pattern, text, flags=re.MULTILINE):
            return re.sub(pattern, replacement, text, flags=re.MULTILINE)
        return text + f"\n{replacement}"

    env_text = replace_or_append(env_text, "POLY_API_KEY",    api_key)
    env_text = replace_or_append(env_text, "POLY_SECRET",     secret)
    env_text = replace_or_append(env_text, "POLY_PASSPHRASE", passphrase)
    env_text = replace_or_append(env_text, "POLY_ADDRESS",    address)

    env_path.write_text(env_text, encoding="utf-8")
    print(f"\n✓ Credentials written to {env_path}")
    print("Restart the dev server to apply.")

if __name__ == "__main__":
    main()
