"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkline } from "./sparkline";

interface MarketSparklineProps {
  tokenId: string;
  width?: number;
  height?: number;
}

export function MarketSparkline({
  tokenId,
  width = 80,
  height = 24,
}: MarketSparklineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [prices, setPrices] = useState<number[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchedRef.current) {
          fetchedRef.current = true;
          fetch(`/api/sparkline/${tokenId}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data: number[]) => {
              if (Array.isArray(data) && data.length >= 2) {
                setPrices(data);
              }
            })
            .catch(() => {});
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [tokenId]);

  return (
    <div ref={ref} style={{ width, height }}>
      {prices ? (
        <Sparkline data={prices} width={width} height={height} />
      ) : (
        <div
          style={{ width, height }}
          className="rounded bg-[#1c2030] animate-pulse"
        />
      )}
    </div>
  );
}
