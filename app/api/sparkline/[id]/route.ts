import { NextRequest, NextResponse } from "next/server";

const CLOB_BASE = "https://clob.polymarket.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = `${CLOB_BASE}/prices-history?market=${id}&interval=1w&fidelity=1440`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const history: { t: number; p: number }[] = Array.isArray(data.history)
      ? data.history
      : [];

    // Return just the price array, sorted ascending by time
    const prices = history
      .sort((a, b) => a.t - b.t)
      .map((pt) => pt.p);

    return NextResponse.json(prices, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
