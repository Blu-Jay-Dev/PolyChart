import { NextRequest, NextResponse } from "next/server";
import { getMarkets, searchMarkets } from "@/lib/polymarket/gamma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const query = searchParams.get("q");
  const category = searchParams.get("category") || undefined;
  const order = searchParams.get("order") || undefined;
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const markets = query
      ? await searchMarkets(query)
      : await getMarkets({ limit, offset, active: true, category, order });

    return NextResponse.json(markets, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("[/api/markets]", err);
    return NextResponse.json({ error: "Failed to fetch markets" }, { status: 500 });
  }
}
