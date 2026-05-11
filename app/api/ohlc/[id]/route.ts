import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { TimeFrame } from "@/lib/polymarket/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const tf = (searchParams.get("tf") || "1D") as TimeFrame;

  const supabase = createServerClient();

  try {
    if (tf === "1D" || tf === "1W") {
      const limit = tf === "1W" ? 365 : 90;
      const { data, error } = await supabase
        .from("ohlc_1d")
        .select("*")
        .eq("token_id", id)
        .order("date", { ascending: true })
        .limit(limit);

      if (error) throw error;

      const bars = (data ?? []).map((row) => ({
        time: Math.floor(new Date(row.date).getTime() / 1000),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume),
      }));

      return NextResponse.json(bars);
    } else {
      // 1H or 4H — serve from ohlc_1h
      const { data, error } = await supabase
        .from("ohlc_1h")
        .select("*")
        .eq("token_id", id)
        .order("hour_ts", { ascending: true })
        .limit(168); // 7 days of hourly data

      if (error) throw error;

      const bars = (data ?? []).map((row) => ({
        time: Math.floor(new Date(row.hour_ts).getTime() / 1000),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume),
      }));

      // For 4H, bucket the 1H bars
      if (tf === "4H") {
        const buckets = new Map<number, typeof bars>();
        for (const b of bars) {
          const bucket = Math.floor(b.time / (4 * 3600)) * (4 * 3600);
          if (!buckets.has(bucket)) buckets.set(bucket, []);
          buckets.get(bucket)!.push(b);
        }
        const bars4h = Array.from(buckets.entries())
          .map(([t, bs]) => ({
            time: t,
            open: bs[0].open,
            high: Math.max(...bs.map((b) => b.high)),
            low: Math.min(...bs.map((b) => b.low)),
            close: bs[bs.length - 1].close,
            volume: bs.reduce((s, b) => s + b.volume, 0),
          }))
          .sort((a, b) => a.time - b.time);
        return NextResponse.json(bars4h);
      }

      return NextResponse.json(bars);
    }
  } catch (err) {
    console.error("[/api/ohlc]", err);
    return NextResponse.json({ error: "Failed to fetch OHLC data" }, { status: 500 });
  }
}
