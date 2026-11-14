import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { ModelSnapshot } from "@/lib/model-data";

const usd = (value: number) => `$${value < 10 ? value.toFixed(2) : value.toFixed(0)}`;
// Always millions with two decimals, so every row uses the same unit.
const tokens = (value: number) => `${(value / 1_000_000).toFixed(2)}M`;

/**
 * Compact homepage data preview: up to three newest-listed models from the
 * OpenRouter models API. Hidden when the API is unavailable. Not a ranking.
 */
export default function ModelWatch({ snapshot, limit = 3 }: { snapshot: ModelSnapshot | null; limit?: number }) {
  if (!snapshot?.models.length) return null;
  const models = [...snapshot.models].sort((a, b) => b.listedOn.localeCompare(a.listedOn)).slice(0, limit);
  const fetched = new Date(snapshot.fetchedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const fetchedShort = new Date(snapshot.fetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <section className="home-section mw" aria-labelledby="model-watch-heading">
      <div className="home-section-head">
        <h2 id="model-watch-heading" className="home-section-title">AI model watch</h2>
        <Link href="/compare" className="home-section-link">Compare AI models <ArrowRight size={13} aria-hidden="true" /></Link>
      </div>
      <table className="mw-table">
        <caption className="sr-only">Most recently listed models on OpenRouter: provider, input and output price per million tokens, and context window</caption>
        <thead><tr><th scope="col">Model</th><th scope="col">Provider</th><th scope="col">Input <span className="mw-unit">/ 1M</span></th><th scope="col">Output <span className="mw-unit">/ 1M</span></th><th scope="col">Context</th></tr></thead>
        <tbody>
          {models.map((model) => (
            <tr key={model.id}>
              <th scope="row"><a href={`https://openrouter.ai/${model.id}`} target="_blank" rel="noopener noreferrer" className="mw-model">{model.name}<span className="sr-only"> (model details on OpenRouter, opens in a new tab)</span></a></th>
              <td>{model.maker}</td>
              <td>{usd(model.inputPerM)}</td>
              <td>{usd(model.outputPerM)}</td>
              <td>{tokens(model.contextTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Phones show the short form; the full line stays on wider screens. */}
      <p className="mw-source">Source: <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">OpenRouter</a><span className="mw-source-full"> · Updated {fetched} UTC · USD API prices</span><span className="mw-source-short"> · {fetchedShort}</span></p>
    </section>
  );
}
