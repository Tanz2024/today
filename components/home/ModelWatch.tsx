import type { ModelSnapshot } from "@/lib/model-data";

const usd = (value: number) => `$${value < 10 ? value.toFixed(2) : value.toFixed(0)}`;
// Always millions with two decimals, so every row uses the same unit.
const tokens = (value: number) => `${(value / 1_000_000).toFixed(2)}M`;
const NEW_DAYS = 7;

/**
 * Model market watch: the newest-listed model per maker from the OpenRouter
 * models API, with live API prices. Hidden when the API is unavailable.
 * "New" means listed on OpenRouter within 7 days of this fetch. Not a ranking.
 */
export default function ModelWatch({ snapshot, limit = 5 }: { snapshot: ModelSnapshot | null; limit?: number }) {
  if (!snapshot?.models.length) return null;
  const models = [...snapshot.models].sort((a, b) => b.listedOn.localeCompare(a.listedOn)).slice(0, limit);
  const fetchedAt = new Date(snapshot.fetchedAt);
  const fetched = fetchedAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const isNew = (listedOn: string) => (fetchedAt.getTime() - new Date(listedOn).getTime()) / 86_400_000 <= NEW_DAYS;

  return (
    <div className="mw">
      <p className="mw-intro">
        <span>API price per 1M tokens, newest models first</span>
        <span className="mw-updated"><span className="mw-live" aria-hidden="true" /> Updated <time dateTime={snapshot.fetchedAt}>{fetched} UTC</time></span>
      </p>
      <div className="mw-table-wrap">
        <table className="mw-table">
          <caption className="sr-only">Newest model per maker on OpenRouter: provider, input and output price in US dollars per million tokens, and context window in tokens</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Provider</th>
              <th scope="col">Input</th>
              <th scope="col">Output</th>
              <th scope="col">Context</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id}>
                <th scope="row">
                  <a href={`https://openrouter.ai/${model.id}`} target="_blank" rel="noopener noreferrer" className="mw-model">{model.name}<span className="sr-only"> (model details on OpenRouter, opens in a new tab)</span></a>
                  {isNew(model.listedOn) ? <span className="mw-new">New</span> : null}
                  <span className="mw-maker">{model.maker}</span>
                </th>
                <td>{model.maker}</td>
                <td>{usd(model.inputPerM)}</td>
                <td>{usd(model.outputPerM)}</td>
                <td>{tokens(model.contextTokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mw-source">Source: <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">OpenRouter</a>. Input and output in USD; context in tokens.</p>
    </div>
  );
}
