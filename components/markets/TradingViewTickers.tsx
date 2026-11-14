"use client";

import { useEffect, useRef } from "react";

// TradingView's free embeddable "Tickers" widget, offered by TradingView for
// display on public websites with its attribution link kept intact. Prices,
// changes and delays are TradingView's own; TodayAI stores nothing. Static row
// (not a scrolling tape). Used when no licensed API feed is configured.
const SYMBOLS = [
  { proName: "NASDAQ:NVDA", title: "NVIDIA" },
  { proName: "NASDAQ:MSFT", title: "Microsoft" },
  { proName: "NASDAQ:GOOGL", title: "Alphabet" },
  { proName: "NASDAQ:META", title: "Meta" },
  { proName: "NASDAQ:AMD", title: "AMD" },
  { proName: "NASDAQ:PLTR", title: "Palantir" },
];

export default function TradingViewTickers() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
    script.async = true;
    script.text = JSON.stringify({ symbols: SYMBOLS, colorTheme: dark ? "dark" : "light", isTransparent: true, showSymbolLogo: false, locale: "en" });
    container.querySelector(".tradingview-widget-container__widget")?.after(script);
    return () => { container.querySelectorAll("script, iframe").forEach((node) => node.remove()); };
  }, []);

  return (
    <section className="mk-strip mk-strip-tv" aria-labelledby="mk-tv-title">
      <div className="mk-strip-head">
        <h2 id="mk-tv-title" className="mk-strip-title">AI stocks</h2>
        <span className="mk-meta">Market data by TradingView · may be delayed · not investment advice</span>
      </div>
      <div ref={host} className="tradingview-widget-container">
        <div className="tradingview-widget-container__widget" />
        <div className="tradingview-widget-copyright mk-source">
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Track all markets on TradingView</a>
        </div>
      </div>
    </section>
  );
}
