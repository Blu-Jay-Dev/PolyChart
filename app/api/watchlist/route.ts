import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from("watchlists")
    .select("market_id, market_title, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { market_id, market_title } = await req.json();
  if (!market_id) return NextResponse.json({ error: "market_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, plan")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check watchlist limit for free plan
  if (user.plan === "free") {
    const { count } = await supabase
      .from("watchlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Watchlist limit reached (5 for free plan)" },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from("watchlists")
    .upsert({ user_id: user.id, market_id, market_title }, { onConflict: "user_id,market_id" })
    .select()
    .single();

  if (error) throw error;
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const marketId = searchParams.get("market_id");
  if (!marketId) return NextResponse.json({ error: "market_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await supabase
    .from("watchlists")
    .delete()
    .eq("user_id", user.id)
    .eq("market_id", marketId);

  return NextResponse.json({ success: true });
}
