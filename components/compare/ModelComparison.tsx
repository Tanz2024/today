"use client";

import { useMemo, useState } from "react";
import type { ModelSnapshot } from "@/lib/model-data";

const tokenLabel = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M` : `${Math.round(value / 1_000)}K`;

export default function ModelComparison({ snapshot }: { snapshot: ModelSnapshot }) {
  const [selected, setSelected] = useState(snapshot.models.slice(0, 3).map((model) => model.id));
  const models = useMemo(() => snapshot.models.filter((model) => selected.includes(model.id)), [selected, snapshot.models]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);

  return (
    <div className="model-comparison">
      <div className="model-picker" aria-label="Select up to three models">
        {snapshot.models.map((model) => <label key={model.id} className="model-picker-option"><input type="checkbox" checked={selected.includes(model.id)} onChange={() => toggle(model.id)} /> <span>{model.product} · {model.name}</span></label>)}
      </div>
      <div className="model-table-wrap"><table className="model-table"><caption className="sr-only">Selected model comparison</caption><thead><tr><th scope="col">Model</th><th scope="col">Provider</th><th scope="col">Listed</th><th scope="col">Context</th><th scope="col">Text</th><th scope="col">Images</th><th scope="col">Files</th><th scope="col">Tool calling</th></tr></thead><tbody>{models.map((model) => <tr key={model.id}><th scope="row">{model.name}</th><td data-label="Provider">{model.maker}</td><td data-label="Listed">{model.listedOn}</td><td data-label="Context">{tokenLabel(model.contextTokens)}</td><td data-label="Text">{model.inputModalities.includes("text") ? "Confirmed" : "Not confirmed"}</td><td data-label="Images">{model.inputModalities.includes("image") ? "Confirmed" : "Not confirmed"}</td><td data-label="Files">{model.inputModalities.includes("file") ? "Confirmed" : "Not confirmed"}</td><td data-label="Tool calling">Not confirmed</td></tr>)}</tbody></table></div>
      <p className="compare-data-note">Capabilities shown here are API input modalities from OpenRouter. Consumer-app features, maximum output tokens, structured output and tool calling are not inferred when the source does not provide them.</p>
    </div>
  );
}
