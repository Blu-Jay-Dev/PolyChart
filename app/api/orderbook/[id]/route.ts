import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, computeSpread } from "@/lib/polymarket/clob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const book = await getOrderBook(id);
    const spread = computeSpread(book);

    return NextResponse.json(
      { book, spread },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=3",
        },
      }
    );
  } catch (err) {
    console.error("[/api/orderbook]", err);
    return NextResponse.json({ error: "Failed to fetch order book" }, { status: 500 });
  }
}
