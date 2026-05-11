import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { cacheGet } from "@/lib/redis";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch all active alerts
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*, users(email)")
    .eq("active", true)
    .is("triggered_at", null);

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ evaluated: 0, fired: 0 });
  }

  let fired = 0;

  for (const alert of alerts) {
    try {
      // Get cached price from Redis
      const priceKey = `price:${alert.token_id}`;
      const currentPrice = await cacheGet<number>(priceKey);

      if (currentPrice === null) continue;

      const spread = await cacheGet<number>(`spread:${alert.token_id}`);
      let triggered = false;

      switch (alert.condition_type) {
        case "price_above":
          triggered = currentPrice >= alert.threshold;
          break;
        case "price_below":
          triggered = currentPrice <= alert.threshold;
          break;
        case "spread_above":
          triggered = (spread ?? 0) >= alert.threshold;
          break;
        case "volume_spike":
          // Volume spike check — would need volume data in cache
          break;
      }

      if (!triggered) continue;

      // Mark alert as triggered
      await supabase
        .from("alerts")
        .update({ triggered_at: new Date().toISOString(), active: false })
        .eq("id", alert.id);

      // Log to alert_history
      await supabase.from("alert_history").insert({
        alert_id: alert.id,
        price_at_trigger: currentPrice,
        delivery_status: "pending",
      });

      // Send email if configured
      if (
        (alert.delivery === "email" || alert.delivery === "both") &&
        alert.users?.email
      ) {
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: alert.users.email,
            subject: `Episteme Alert: ${alert.market_title}`,
            html: `
              <h2>Alert Triggered</h2>
              <p><strong>Market:</strong> ${alert.market_title}</p>
              <p><strong>Condition:</strong> ${alert.condition_type} ${alert.threshold}</p>
              <p><strong>Current Price:</strong> ${(currentPrice * 100).toFixed(1)}%</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/market/${alert.token_id}">View Market</a></p>
              <hr/>
              <small>Not financial advice. Episteme displays analytical data only.</small>
            `,
          });

          await supabase
            .from("alert_history")
            .update({ delivery_status: "sent" })
            .eq("alert_id", alert.id)
            .order("triggered_at", { ascending: false })
            .limit(1);
        } catch (emailErr) {
          console.error("[alert-eval] Email send failed:", emailErr);
        }
      }

      fired++;
    } catch (err) {
      console.error(`[alert-eval] Error for alert ${alert.id}:`, err);
    }
  }

  return NextResponse.json({ evaluated: alerts.length, fired });
}
