import { NextRequest } from "next/server";
import { cacheSet } from "@/lib/redis";

// Server-Sent Events endpoint that relays Polymarket WS price updates.
// The browser subscribes to this SSE stream for a given market token_id.
// We maintain one WS connection per market server-side and fan out via SSE.

const WS_URL =
  process.env.POLYMARKET_WS_URL ||
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get("token");
  if (!tokenId) {
    return new Response("token param required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Client disconnected
        }
      };

      // Send keepalive comment
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15000);

      // Connect to Polymarket WS
      let ws: WebSocket | null = null;

      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              type: "subscribe",
              channel: "market",
              markets: [tokenId],
            })
          );
        };

        ws.onmessage = async (event) => {
          try {
            const messages = JSON.parse(event.data as string);
            const msgArray = Array.isArray(messages) ? messages : [messages];

            for (const msg of msgArray) {
              sendEvent(msg);

              // Cache latest price in Redis for alert evaluation
              if (msg.type === "book" && msg.bids?.length && msg.asks?.length) {
                const bid = parseFloat(msg.bids[0].price);
                const ask = parseFloat(msg.asks[0].price);
                const mid = (bid + ask) / 2;
                const spread = ask - bid;
                await cacheSet(`price:${tokenId}`, mid, 30);
                await cacheSet(`spread:${tokenId}`, spread, 30);
              }

              if (msg.type === "price_change") {
                // Update last known price
                const latestChange = msg.changes?.[msg.changes.length - 1];
                if (latestChange) {
                  await cacheSet(
                    `price:${tokenId}`,
                    parseFloat(latestChange.price),
                    30
                  );
                }
              }
            }
          } catch {
            // Parse error — skip
          }
        };

        ws.onerror = () => {
          sendEvent({ type: "error", message: "WS connection error" });
        };

        ws.onclose = () => {
          clearInterval(keepalive);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        };
      } catch {
        sendEvent({ type: "error", message: "Failed to connect to Polymarket" });
        clearInterval(keepalive);
        controller.close();
      }

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(keepalive);
        ws?.close();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
