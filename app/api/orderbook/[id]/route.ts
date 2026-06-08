import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, computeSpread } from "@/lib/polymarket/clob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const raw = await getOrderBook(id);
    // CLOB returns bids asc / asks desc — normalise to standard order book order
    const book = {
      ...raw,
      bids: [...(raw.bids ?? [])].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)),
      asks: [...(raw.asks ?? [])].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)),
    };
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
