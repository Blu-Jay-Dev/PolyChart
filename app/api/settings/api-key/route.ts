import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";

const DATA_API = process.env.POLYMARKET_DATA_BASE_URL || "https://data-api.polymarket.com";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = await req.json();
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  // Validate the API key against Data API
  const validationRes = await fetch(`${DATA_API}/profile`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!validationRes.ok) {
    return NextResponse.json(
      { error: "Invalid API key — validation against Polymarket failed" },
      { status: 400 }
    );
  }

  // Encrypt and store
  const encrypted = await encrypt(apiKey);
  const supabase = createServerClient();

  const { error } = await supabase
    .from("users")
    .update({ poly_api_key_enc: encrypted })
    .eq("clerk_id", userId);

  if (error) throw error;

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  await supabase
    .from("users")
    .update({ poly_api_key_enc: null })
    .eq("clerk_id", userId);

  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("poly_api_key_enc")
    .eq("clerk_id", userId)
    .single();

  const hasKey = !!user?.poly_api_key_enc;

  // Return masked key for display
  let maskedKey: string | null = null;
  if (hasKey && user?.poly_api_key_enc) {
    try {
      const raw = await decrypt(user.poly_api_key_enc);
      maskedKey = raw.slice(0, 6) + "••••••••" + raw.slice(-4);
    } catch {
      maskedKey = "••••••••••••";
    }
  }

  return NextResponse.json({ hasKey, maskedKey });
}
