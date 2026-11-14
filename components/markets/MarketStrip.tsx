import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { MarketQuote, MarketSnapshot } from "@/lib/market-data";

const money = (value: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const signed = (value: number, digits = 2) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;

export function quoteTimeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET";
}

export function freshnessLabel(snapshot: MarketSnapshot) {
  const open = snapshot.quotes.some((q) => q.session === "open");
  if (!open) return "Market closed · last close";
  return snapshot.delayMinutes > 0 ? `Delayed ${snapshot.delayMinutes} min` : "Real-time";
}

/** Sparkline from real daily closes. Renders nothing without history. */
export function Sparkline({ history, width = 72, height = 24, label }: { history: MarketQuote["history"]; width?: number; height?: number; label?: string }) {
  if (history.length < 5) return null;
  const closes = history.map((h) => h.close);
  const min = Math.min(...closes);
  const span = Math.max(...closes) - min || 1;
  const points = closes.map((c, i) => `${((i / (closes.length - 1)) * width).toFixed(1)},${(height - 2 - ((c - min) / span) * (height - 4)).toFixed(1)}`).join(" ");
  const up = closes[closes.length - 1] >= closes[0];
  return (
    <svg className={`mk-spark ${up ? "is-up" : "is-down"}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function QuoteChange({ quote }: { quote: MarketQuote }) {
  const dir = quote.change > 0 ? "is-up" : quote.change < 0 ? "is-down" : "";
  return <span className={`mk-change ${dir}`}>{signed(quote.change)} ({signed(quote.changePercent)}%)</span>;
}

/** Compact homepage strip. Caller renders it only when a snapshot exists. */
export default function MarketStrip({ snapshot }: { snapshot: MarketSnapshot }) {
  const latest = snapshot.quotes.map((q) => q.quoteTime).sort().at(-1)!;
  return (
    <section className="mk-strip" aria-labelledby="mk-strip-title">
      <div className="mk-strip-head">
        <h2 id="mk-strip-title" className="mk-strip-title">AI stocks</h2>
        <span className="mk-meta">{freshnessLabel(snapshot)} · {quoteTimeLabel(latest)}</span>
        <Link href="/ai-markets" className="mk-all">See all <ArrowRight size={12} aria-hidden="true" /></Link>
      </div>
      <ul className="mk-row">
        {snapshot.quotes.map((quote) => (
          <li key={quote.symbol}>
            <Link href={`/ai-markets#${quote.symbol.toLowerCase()}`} className="mk-item" aria-label={`${quote.name} (${quote.symbol}) ${money(quote.price, quote.currency)}, ${signed(quote.changePercent)}% today`}>
              <span className="mk-symbol">{quote.symbol}</span>
              <span className="mk-price">{money(quote.price, quote.currency)}</span>
              <QuoteChange quote={quote} />
              <Sparkline history={quote.history} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mk-source">Data: <a href={snapshot.source.url} target="_blank" rel="noopener noreferrer">{snapshot.source.name}</a> · not investment advice</p>
    </section>
  );
}
