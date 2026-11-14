import type { CSSProperties } from "react";
import type { ModelSnapshot } from "@/lib/model-data";

const usd = (value: number) => `$${value < 10 ? value.toFixed(2) : value.toFixed(0)}`;
const tokens = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M` : `${Math.round(value / 1_000)}K`;
const colors = ["#dc1f32", "#2563eb", "#52525b", "#b5162a", "#64748b", "#111114"];

export default function ModelInfographic({ snapshot }: { snapshot: ModelSnapshot }) {
  const models = snapshot.models;
  const maxPrice = Math.max(...models.map((model) => Math.max(model.inputPerM, model.outputPerM)), 1);
  const maxContext = Math.max(...models.map((model) => model.contextTokens), 1);
  return (
    <div className="compare-data-viz">
      <div className="compare-chart-grid">
        <figure className="compare-chart"><figcaption><strong>API price per 1M tokens</strong><span>Input and output, USD</span></figcaption><ul className="compare-bars">{models.map((model, index) => <li key={model.id}><span className="compare-bar-label">{model.product}</span><span className="compare-bar-pair"><span className="compare-bar-track"><i className="compare-bar-input" style={{ "--bar": `${Math.max(1, model.inputPerM / maxPrice * 100)}%`, "--color": colors[index % colors.length] } as CSSProperties} /></span><span className="compare-bar-value">{usd(model.inputPerM)}</span><span className="compare-bar-track"><i className="compare-bar-output" style={{ "--bar": `${Math.max(1, model.outputPerM / maxPrice * 100)}%`, "--color": colors[index % colors.length] } as CSSProperties} /></span><span className="compare-bar-value">{usd(model.outputPerM)}</span></span></li>)}</ul><p className="compare-chart-legend"><span className="legend-input" /> input <span className="legend-output" /> output</p></figure>
        <figure className="compare-chart"><figcaption><strong>Maximum context window</strong><span>More context is not automatically better</span></figcaption><ul className="compare-bars">{[...models].sort((a, b) => b.contextTokens - a.contextTokens).map((model, index) => <li key={model.id}><span className="compare-bar-label">{model.product}</span><span className="compare-bar-pair"><span className="compare-bar-track"><i className="compare-bar-context" style={{ "--bar": `${Math.max(1, model.contextTokens / maxContext * 100)}%`, "--color": colors[index % colors.length] } as CSSProperties} /></span><span className="compare-bar-value">{tokens(model.contextTokens)}</span></span></li>)}</ul><p className="compare-chart-legend">Source field: model context length</p></figure>
      </div>
      <p className="compare-data-note">Source: <a href="https://openrouter.ai/api/v1/models" target="_blank" rel="noopener noreferrer">OpenRouter Models API</a> · values fetched {new Date(snapshot.fetchedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC. Prices are API token rates, not consumer subscriptions.</p>
    </div>
  );
}
