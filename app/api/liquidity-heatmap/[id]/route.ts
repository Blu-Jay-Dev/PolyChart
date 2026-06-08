import { NextRequest, NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_BASE = "https://gamma-api.polymarket.com";

export interface HeatmapCell {
  hour: number;   // 0-23 UTC
  day: number;    // 0=Sun … 6=Sat
  volume: number;
  tradeCount: number;
}

export interface LiquidityHeatmapData {
  cells: HeatmapCell[];
  peakHour: number;
  peakDay: number;
  totalVolume: number;
}

async function getConditionId(tokenId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GAMMA_BASE}/markets?clobTokenIds=${tokenId}&limit=1`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.conditionId ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conditionId = await getConditionId(id);
  if (!conditionId) return NextResponse.json({ cells: [], peakHour: 12, peakDay: 1, totalVolume: 0 });

  // Fetch up to 2000 trades for heatmap analysis
  const allTrades: { timestamp: number; size: number }[] = [];
  const LIMIT = 500;
  for (let page = 0; page < 4; page++) {
    try {
      const res = await fetch(
        `${DATA_API}/trades?market=${conditionId}&limit=${LIMIT}&offset=${page * LIMIT}`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) break;
      const trades = await res.json();
      if (!Array.isArray(trades) || trades.length === 0) break;
      allTrades.push(...trades.map((t: { timestamp: number; size: number }) => ({
        timestamp: t.timestamp,
        size: t.size,
      })));
      if (trades.length < LIMIT) break;
    } catch { break; }
  }

  // Aggregate into 7×24 grid
  const grid = new Map<string, HeatmapCell>();
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid.set(`${d}-${h}`, { hour: h, day: d, volume: 0, tradeCount: 0 });
    }
  }

  for (const t of allTrades) {
    const date = new Date(t.timestamp * 1000);
    const key = `${date.getUTCDay()}-${date.getUTCHours()}`;
    const cell = grid.get(key);
    if (cell) {
      cell.volume += t.size;
      cell.tradeCount++;
    }
  }

  const cells = Array.from(grid.values());
  let peakCell = cells[0];
  let totalVolume = 0;
  for (const c of cells) {
    totalVolume += c.volume;
    if (c.volume > peakCell.volume) peakCell = c;
  }

  return NextResponse.json(
    {
      cells,
      peakHour: peakCell.hour,
      peakDay: peakCell.day,
      totalVolume: Math.round(totalVolume),
    } satisfies LiquidityHeatmapData,
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
  );
}
