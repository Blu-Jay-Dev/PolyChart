import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/markets(.*)",
  "/api/orderbook(.*)",
  "/api/ohlc(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
]);

// If Clerk keys aren't configured yet, skip auth on public routes
const hasClerkKeys =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

export const proxy = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : (req: Request) => {
      // Dev mode without Clerk: redirect dashboard routes to landing
      const url = new URL(req.url);
      const isDashboard =
        !isPublicRoute({ url, nextUrl: url } as Parameters<typeof isPublicRoute>[0]);
      if (isDashboard) {
        return NextResponse.redirect(new URL("/?setup=true", req.url));
      }
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
