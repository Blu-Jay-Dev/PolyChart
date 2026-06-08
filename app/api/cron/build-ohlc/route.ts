import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTrades } from "@/lib/polymarket/clob";
import { buildOHLC } from "@/lib/ohlc/builder";

// Vercel Cron: every 5 minutes
// vercel.json: { "crons": [{ "path": "/api/cron/build-ohlc", "schedule": "*/5 * * * *" }] }

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Get all watchlisted markets
    const { data: watchlistItems } = await supabase
      .from("watchlists")
      .select("market_id")
      .limit(200);

    const tokenIds = [
      ...new Set((watchlistItems ?? []).map((w) => w.market_id)),
    ];

    if (tokenIds.length === 0) {
      return NextResponse.json({ message: "No watchlisted markets", built: 0 });
    }

    let built = 0;

    for (const tokenId of tokenIds) {
      try {
        const trades = await getTrades({ tokenId, limit: 1000 });
        if (trades.length === 0) continue;

        // Build 1H bars
        const hourlyBars = buildOHLC(trades, "1H");
        if (hourlyBars.length > 0) {
          const hourlyRows = hourlyBars.map((b) => ({
            token_id: tokenId,
            hour_ts: new Date(b.time * 1000).toISOString(),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
          }));

          await supabase
            .from("ohlc_1h")
            .upsert(hourlyRows, { onConflict: "token_id,hour_ts" });
        }

        // Build 1D bars
        const dailyBars = buildOHLC(trades, "1D");
        if (dailyBars.length > 0) {
          const dailyRows = dailyBars.map((b) => ({
            token_id: tokenId,
            date: new Date(b.time * 1000).toISOString().split("T")[0],
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
            constructed_at: new Date().toISOString(),
          }));

          await supabase
            .from("ohlc_1d")
            .upsert(dailyRows, { onConflict: "token_id,date" });
        }

        built++;
      } catch (err) {
        console.error(`[build-ohlc] Error for token ${tokenId}:`, err);
      }
    }

    return NextResponse.json({ message: "OHLC build complete", built });
  } catch (err) {
    console.error("[build-ohlc]", err);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
