import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { QuoteChange, Sparkline, freshnessLabel, quoteTimeLabel } from "@/components/markets/MarketStrip";
import { MARKET_SYMBOLS, getMarketSnapshot, isMarketDataEnabled } from "@/lib/market-data";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

// Indexable only while licensed data is actually shown.
export const metadata = buildMetadata({
  title: "AI stocks watch",
  description: "Prices, daily moves and 30-day closes for major publicly traded AI companies: NVIDIA, Microsoft, Alphabet, Meta, AMD and Palantir. Delayed data with source attribution.",
  path: "/ai-markets",
  noindex: !isMarketDataEnabled(),
});

const money = (value: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function AiMarketsPage() {
  const snapshot = await getMarketSnapshot();

  return (
    <Container className="hub">
      <PageHeader eyebrow="AI markets" title="AI stocks watch" description="How shares in six companies at the centre of the AI build-out are moving. Facts only — no predictions or advice." />

      {!snapshot ? (
        <p className="compare-note">Market data isn&apos;t available right now. {isMarketDataEnabled() ? "The data provider didn't respond; please check back later." : "A licensed data source hasn't been connected to TodayAI yet, so no prices are shown."}</p>
      ) : (
        <>
          <p className="mk-meta mk-page-meta">{freshnessLabel(snapshot)} · Data: <a href={snapshot.source.url} target="_blank" rel="noopener noreferrer" className="underline">{snapshot.source.name}</a> · Charts show daily closing prices</p>
          <ul className="mk-grid">
            {snapshot.quotes.map((quote) => (
              <li key={quote.symbol} id={quote.symbol.toLowerCase()} className="mk-card">
                <div className="mk-card-head">
                  <div><span className="mk-symbol">{quote.symbol}</span> <span className="mk-meta">{quote.name}</span></div>
                  <span className="mk-meta">{quoteTimeLabel(quote.quoteTime)}</span>
                </div>
                <div className="mk-card-price"><strong>{money(quote.price, quote.currency)}</strong> <QuoteChange quote={quote} /></div>
                {quote.history.length ? (
                  <>
                    <Sparkline history={quote.history} width={320} height={96} label={`${quote.symbol} daily closes from ${quote.history[0].date} to ${quote.history.at(-1)!.date}`} />
                    <div className="mk-axis"><span>{quote.history[0].date}</span><span>{quote.history.length} daily closes</span><span>{quote.history.at(-1)!.date}</span></div>
                  </>
                ) : <p className="mk-meta">Price history unavailable.</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="hub-section legal-page" aria-labelledby="mk-about">
        <h2 id="mk-about">What this shows</h2>
        <p>These are {MARKET_SYMBOLS.length} large listed companies whose businesses are closely tied to AI: chips ({MARKET_SYMBOLS.filter((s) => ["NVDA", "AMD"].includes(s.symbol)).map((s) => s.name).join(", ")}), cloud and models (Microsoft, Alphabet, Meta) and AI software (Palantir). Their share prices move for many reasons besides AI.</p>
        <p>The daily change compares the latest price with the previous session&apos;s close. Outside US trading hours (9:30–16:00 New York time, weekdays) the price shown is the last close. This page is information, not investment advice. Read more <Link href="/news" className="underline">AI news</Link>.</p>
      </section>
    </Container>
  );
}
