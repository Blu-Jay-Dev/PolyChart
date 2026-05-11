import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Episteme — Polymarket Analytics Terminal",
  description:
    "Professional charting and analytics for Polymarket traders. OHLC charts, order book depth, portfolio tracking, and smart alerts.",
  openGraph: {
    title: "Episteme — Polymarket Analytics Terminal",
    description: "TradingView for Polymarket. OHLC charts, order book depth, portfolio analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="min-h-full bg-[#0d0f12] text-slate-200 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
