import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, plan")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: alerts, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return NextResponse.json(alerts ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, plan")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check alert limits by plan
  const { count } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true);

  const limit = user.plan === "pro" ? 50 : 2;
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Alert limit reached (${limit} for ${user.plan} plan)` },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { token_id, market_title, condition_type, threshold, delivery } = body;

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      token_id,
      market_title,
      condition_type,
      threshold,
      delivery: delivery ?? "in_app",
      active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { searchParams } = req.nextUrl;
  const alertId = searchParams.get("id");

  if (!alertId) return NextResponse.json({ error: "Alert ID required" }, { status: 400 });

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await supabase
    .from("alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
