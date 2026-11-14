"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useAccessFilter } from "@/components/compare/AccessFilter";
import { ACCESS_LABEL } from "@/components/compare/RankedChart";
import { formatUsd, formatValue, matchesAccess, monthLabel, niceTicks, valueFrontier, type ValuePoint } from "@/lib/model-rankings";

/**
 * Index score (y) against blended API price (x, log scale). The value frontier
 * — models no other model beats on both price and score — is joined by a line
 * and numbered; the numbered list and the full table below are the text
 * alternative, so nothing depends on hovering.
 */
export default function ValueScatter({ points }: { points: ValuePoint[] }) {
  const { filter } = useAccessFilter();
  const plot = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const visible = points.filter((point) => matchesAccess(point.access, filter));
  if (visible.length < 2) return <p className="rank-empty">Not enough {filter === "open" ? "open-weight" : filter === "closed" ? "closed" : ""} models have both a score and a price.</p>;

  const frontier = valueFrontier(visible, (point) => point.price, (point) => point.score);
  const frontierIndex = new Map(frontier.map((point, index) => [point.id, index + 1]));

  const minExp = Math.floor(Math.log10(Math.min(...visible.map((point) => point.price))));
  const maxExp = Math.ceil(Math.log10(Math.max(...visible.map((point) => point.price))));
  const xTicks = Array.from({ length: maxExp - minExp + 1 }, (_, index) => 10 ** (minExp + index));
  const yRough = niceTicks(Math.min(...visible.map((point) => point.score)), Math.max(...visible.map((point) => point.score)), 4);
  const yStep = yRough.length > 1 ? yRough[1] - yRough[0] : 5;
  const yMin = Math.floor(Math.min(...visible.map((point) => point.score)) / yStep) * yStep;
  const yMax = Math.ceil(Math.max(...visible.map((point) => point.score)) / yStep) * yStep;
  const yTicks: number[] = [];
  for (let tick = yMin; tick <= yMax + 1e-6; tick += yStep) yTicks.push(Number(tick.toFixed(6)));

  // Rounded so server HTML and client hydration agree on inline styles.
  const round = (value: number) => Math.round(value * 100) / 100;
  const x = (price: number) => round(((Math.log10(price) - minExp) / (maxExp - minExp || 1)) * 100);
  const y = (score: number) => round(100 - ((score - yMin) / (yMax - yMin || 1)) * 100);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box) return;
    let best: { id: string; distance: number } | null = null;
    for (const point of visible) {
      const dx = (x(point.price) / 100) * box.width - (event.clientX - box.left);
      const dy = (y(point.score) / 100) * box.height - (event.clientY - box.top);
      const distance = Math.hypot(dx, dy);
      if (distance < 28 && (!best || distance < best.distance)) best = { id: point.id, distance };
    }
    setHovered(best?.id ?? null);
  };

  const active = visible.find((point) => point.id === hovered) ?? null;
  const sorted = [...visible].sort((a, b) => b.score - a.score);

  return (
    <div className="value-scatter">
      <div className="scatter-frame">
        <span className="scatter-y-title">Capabilities Index ↑</span>
        <div className="scatter-plot" ref={plot} onPointerMove={onPointerMove} onPointerLeave={() => setHovered(null)} role="img" aria-label={`Scatter plot of ${visible.length} models: Epoch Capabilities Index against blended API price. ${frontier.length} models are on the value frontier, listed below the chart.`}>
          {yTicks.map((tick) => <span key={`y${tick}`} className="scatter-grid-y" style={{ top: `${y(tick)}%` }}><span>{tick}</span></span>)}
          {xTicks.map((tick, index) => <span key={`x${tick}`} className="scatter-grid-x" data-edge={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : undefined} style={{ left: `${x(tick)}%` }}><span>${tick >= 1 ? tick.toLocaleString("en-GB") : tick}</span></span>)}
          <svg className="scatter-frontier" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={frontier.map((point) => `${x(point.price)},${y(point.score)}`).join(" ")} vectorEffect="non-scaling-stroke" />
          </svg>
          {visible.map((point) => (
            <span key={point.id} className="scatter-point" data-access={point.access} data-frontier={frontierIndex.has(point.id) || undefined} data-active={point.id === hovered || undefined} style={{ left: `${x(point.price)}%`, top: `${y(point.score)}%` }} aria-hidden="true" />
          ))}
          {frontier.map((point, index) => (
            <span key={`label-${point.id}`} className="scatter-label" style={{ left: `${x(point.price)}%`, top: `${y(point.score)}%` }} aria-hidden="true">{index + 1}</span>
          ))}
          {active ? (
            <div className="scatter-tip" data-side={x(active.price) > 50 ? "left" : "right"} style={{ left: `${x(active.price)}%`, top: `${y(active.score)}%` }} aria-hidden="true">
              <strong>{active.score.toFixed(1)}</strong> index · <strong>{formatUsd(active.price)}</strong> / 1M
              <span>{active.name} · {active.organization} · {ACCESS_LABEL[active.access]}</span>
            </div>
          ) : null}
        </div>
        <span className="scatter-x-title">Blended API price, USD per 1M tokens (log scale) →</span>
      </div>
      <div className="scatter-legend" aria-hidden="true">
        <span><i className="scatter-point" data-access="open" /> Open weights</span>
        <span><i className="scatter-point" data-access="closed" /> Closed</span>
        {visible.some((point) => point.access === "other") ? <span><i className="scatter-point" data-access="other" /> Other / not stated</span> : null}
        <span><i className="scatter-legend-line" /> Value frontier</span>
      </div>
      <h3 className="scatter-subhead">Value frontier: nothing else is both cheaper and smarter</h3>
      <ol className="scatter-frontier-list">
        {frontier.map((point) => (
          <li key={point.id}>
            <span className="scatter-frontier-name">{point.name}</span>
            <span className="rank-access" data-access={point.access} title={point.accessDetail}><i aria-hidden="true" />{ACCESS_LABEL[point.access]}</span>
            <span className="scatter-frontier-meta">{formatUsd(point.price)} / 1M · index {point.score.toFixed(1)}</span>
          </li>
        ))}
      </ol>
      <details className="scatter-table">
        <summary>Table: all {visible.length} models in this chart, with every measure</summary>
        <div className="model-table-wrap">
          <table className="model-table">
            <caption className="sr-only">Models with both an Epoch Capabilities Index score and an OpenRouter price</caption>
            <thead><tr><th scope="col">Model</th><th scope="col">Maker</th><th scope="col">Weights</th><th scope="col">Released</th><th scope="col">Index</th><th scope="col">Arena score</th><th scope="col">Blended / 1M</th><th scope="col">Input / 1M</th><th scope="col">Output / 1M</th></tr></thead>
            <tbody>
              {sorted.map((point) => (
                <tr key={point.id}>
                  <th scope="row">{point.name}</th>
                  <td>{point.organization}</td>
                  <td title={point.accessDetail}>{ACCESS_LABEL[point.access]}</td>
                  <td>{monthLabel(point.released)}</td>
                  <td>{point.score.toFixed(1)}</td>
                  <td>{point.arena === null ? "No data" : formatValue(point.arena, "arena")}</td>
                  <td>{formatUsd(point.price)}</td>
                  <td>{formatUsd(point.inputPerM)}</td>
                  <td>{formatUsd(point.outputPerM)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
