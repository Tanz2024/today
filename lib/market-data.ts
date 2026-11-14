// AI stock watch: server-side quotes + daily closes, fetched centrally and
// cached in the Next data cache (one upstream call per window for all
// visitors). Provider: Twelve Data REST API.
//
// LICENSING: free/personal API plans generally do NOT permit public display
// on a commercial (ad-supported) site. The module stays OFF unless an
// operator has a plan that grants display rights and says so explicitly:
//   MARKET_DATA_API_KEY=...                (server only)
//   MARKET_DATA_LICENSE_CONFIRMED=true     (operator confirms display rights)
//   MARKET_DATA_DELAY_MINUTES=15           (delay stated by your plan; 0 = real-time)
// Without all of these nothing is fetched and nothing is shown. No mock or
// fallback prices exist anywhere.

import { boundedFetch } from "@/lib/bounded-fetch";

export const MARKET_SYMBOLS = [
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "PLTR", name: "Palantir" },
] as const;

export const MARKET_SOURCE = { name: "Twelve Data", url: "https://twelvedata.com" };
const API = "https://api.twelvedata.com";
const HISTORY_DAYS = 30;

export type MarketQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  /** ISO time of the quote as reported by the provider. */
  quoteTime: string;
  session: "open" | "closed";
  /** Daily closes, oldest first; empty if history is unavailable. */
  history: { date: string; close: number }[];
};

export type MarketSnapshot = { quotes: MarketQuote[]; source: typeof MARKET_SOURCE; delayMinutes: number; fetchedAt: string };

export function isMarketDataEnabled() {
  return Boolean(process.env.MARKET_DATA_API_KEY?.trim()) && process.env.MARKET_DATA_LICENSE_CONFIRMED === "true";
}

/** NYSE/Nasdaq regular session, Mon–Fri 09:30–16:00 America/New_York (holidays not modelled; the provider's flag wins). */
export function isUsMarketOpen(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now).map((p) => [p.type, p.value]));
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 570 && minutes < 960;
}

const num = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

async function getJson(path: string, revalidate: number) {
  const url = `${API}${path}&apikey=${encodeURIComponent(process.env.MARKET_DATA_API_KEY!.trim())}`;
  const response = await boundedFetch(url, { provider: "Twelve Data", timeoutMs: 6_000, next: { revalidate, tags: ["market-data"] } });
  if (!response.ok) return null;
  const data = (await response.json()) as Record<string, unknown>;
  return data?.status === "error" ? null : data;
}

/** Shared snapshot. Returns null when disabled or when the provider fails. */
export async function getMarketSnapshot(): Promise<MarketSnapshot | null> {
  if (!isMarketDataEnabled()) return null;
  // Quotes refresh every 5 min during the session, hourly when closed.
  const open = isUsMarketOpen();
  const symbols = MARKET_SYMBOLS.map((s) => s.symbol).join(",");
  try {
    const [quoteData, seriesData] = await Promise.all([
      getJson(`/quote?symbol=${symbols}`, open ? 300 : 3600),
      // Daily closes only change once per day.
      getJson(`/time_series?symbol=${symbols}&interval=1day&outputsize=${HISTORY_DAYS}`, open ? 3600 : 6 * 3600).catch(() => null),
    ]);
    if (!quoteData) return null;
    const quotes: MarketQuote[] = [];
    for (const { symbol, name } of MARKET_SYMBOLS) {
      const q = quoteData[symbol] as Record<string, unknown> | undefined;
      const price = num(q?.close);
      const change = num(q?.change);
      const changePercent = num(q?.percent_change);
      const timestamp = typeof q?.timestamp === "number" ? q.timestamp : null;
      if (!q || price === null || change === null || changePercent === null || !timestamp) continue; // skip incomplete rows
      const series = (seriesData?.[symbol] as { values?: { datetime?: string; close?: string }[] } | undefined)?.values ?? [];
      const history = series
        .map((v) => ({ date: String(v.datetime ?? ""), close: num(v.close) }))
        .filter((v): v is { date: string; close: number } => /^\d{4}-\d{2}-\d{2}$/.test(v.date) && v.close !== null)
        .reverse();
      quotes.push({
        symbol,
        name,
        currency: typeof q.currency === "string" ? q.currency : "USD",
        price,
        change,
        changePercent,
        quoteTime: new Date(timestamp * 1000).toISOString(),
        session: q.is_market_open === true ? "open" : "closed",
        history: history.length >= 5 ? history : [],
      });
    }
    if (!quotes.length) return null;
    const delay = Number(process.env.MARKET_DATA_DELAY_MINUTES ?? "15");
    return { quotes, source: MARKET_SOURCE, delayMinutes: Number.isFinite(delay) && delay >= 0 ? delay : 15, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
