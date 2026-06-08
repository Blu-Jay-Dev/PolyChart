import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { aggregatePortfolio } from "@/lib/portfolio/aggregate";
import { cacheGet, cacheSet } from "@/lib/redis";

const DATA_API = process.env.POLYMARKET_DATA_BASE_URL || "https://data-api.polymarket.com";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bypass = req.nextUrl.searchParams.get("refresh") === "true";
  const cacheKey = `portfolio:${userId}`;

  if (!bypass) {
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const supabase = createServerClient();

  // Get user + API key
  const { data: user } = await supabase
    .from("users")
    .select("poly_api_key_enc")
    .eq("clerk_id", userId)
    .single();

  if (!user?.poly_api_key_enc) {
    return NextResponse.json(
      { error: "Polymarket API key not configured" },
      { status: 400 }
    );
  }

  const apiKey = await decrypt(user.poly_api_key_enc);

  // Fetch positions from Data API
  const res = await fetch(`${DATA_API}/positions?user=${apiKey}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch positions from Polymarket" },
      { status: 502 }
    );
  }

  const rawPositions = await res.json();
  const portfolio = aggregatePortfolio(rawPositions ?? []);

  await cacheSet(cacheKey, portfolio, 30);

  return NextResponse.json(portfolio);
}
