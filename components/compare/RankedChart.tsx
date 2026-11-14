"use client";

import { useId, useState, type CSSProperties } from "react";
import { useAccessFilter } from "@/components/compare/AccessFilter";
import { formatValue, matchesAccess, niceTicks, type Access, type ChartRow, type ValueFormat } from "@/lib/model-rankings";

export const ACCESS_LABEL: Record<Access, string> = { open: "Open", closed: "Closed", other: "Other" };

/**
 * Ranked list chart. Every row is in the server-rendered HTML; the filter and
 * "show all" only toggle `hidden`, and rank numbers count within the current
 * filter so the top open model reads as rank 1 under "Open weights".
 *
 * mode "interval": a dot for the score and a line for its confidence interval
 *   (index and arena scores have no meaningful zero, so no bars).
 * mode "bar": a bar from zero (percentages, prices, token counts).
 */
export default function RankedChart({ label, rows, format, mode, initial = 20, intervalLabel = "90% confidence interval", fixedMax }: {
  label: string;
  rows: ChartRow[];
  format: ValueFormat;
  mode: "interval" | "bar";
  initial?: number;
  intervalLabel?: string;
  /** Fix the bar scale's maximum (e.g. 1 for percentages) instead of fitting the visible rows. */
  fixedMax?: number;
}) {
  const { filter } = useAccessFilter();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const filtered = rows.filter((row) => matchesAccess(row.access, filter));
  const shown = expanded ? filtered : filtered.slice(0, initial);
  const rankOf = new Map(filtered.map((row, index) => [row.id, index + 1]));
  const overallRank = new Map(rows.map((row, index) => [row.id, index + 1]));
  const shownIds = new Set(shown.map((row) => row.id));

  const domain = scaleFor(shown, mode, fixedMax);
  // Rounded so server HTML and client hydration agree on the inline style.
  const position = (value: number) => `${Math.min(100, Math.max(0, ((value - domain.min) / (domain.max - domain.min || 1)) * 100)).toFixed(2)}%`;

  if (!filtered.length) {
    return <p className="rank-empty">No {filter === "open" ? "open-weight" : "closed"} models appear in this ranking.</p>;
  }

  return (
    <div className="rank-chart" data-mode={mode} style={{ "--grid-steps": Math.max(1, domain.ticks.length - 1) } as CSSProperties}>
      <div className="rank-axis" aria-hidden="true">
        <span className="rank-axis-plot">{domain.ticks.map((tick) => <span key={tick} style={{ left: position(tick) }}>{tickLabel(tick, format)}</span>)}</span>
      </div>
      <ol className="rank-list" id={listId} aria-label={label}>
        {rows.map((row) => {
          const visible = shownIds.has(row.id);
          const rank = rankOf.get(row.id);
          const hasInterval = mode === "interval" && row.low !== undefined && row.high !== undefined && row.high > row.low;
          return (
            <li key={row.id} className="rank-row" data-access={row.access} hidden={!visible}>
              <span className="rank-num">{rank ? <><span className="sr-only">Rank </span>{rank}</> : null}</span>
              <span className="rank-id">
                <span className="rank-name-line">
                  <span className="rank-name">{row.name}</span>
                  <span className="rank-access" data-access={row.access} title={row.accessDetail}><i aria-hidden="true" />{ACCESS_LABEL[row.access]}<span className="sr-only"> ({row.accessDetail || "not stated"})</span></span>
                </span>
                <span className="rank-meta">{[filter !== "all" ? `#${overallRank.get(row.id)} of all` : "", row.meta, row.note].filter(Boolean).join(" · ")}</span>
              </span>
              {visible ? (
                <span className="rank-plot" aria-hidden="true" title={hasInterval ? `${intervalLabel}: ${formatValue(row.low!, format)}–${formatValue(row.high!, format)}` : undefined}>
                  {mode === "bar" ? (
                    <span className="rank-bar" style={{ "--bar": position(row.value) } as CSSProperties} />
                  ) : (
                    <>
                      {hasInterval ? <span className="rank-range" style={{ left: position(row.low!), right: `calc(100% - ${position(row.high!)})` }} /> : null}
                      <span className="rank-dot" style={{ left: position(row.value) }} />
                    </>
                  )}
                </span>
              ) : null}
              <span className="rank-value">
                {formatValue(row.value, format)}
                {hasInterval ? <span className="sr-only"> ({intervalLabel} {formatValue(row.low!, format)} to {formatValue(row.high!, format)})</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {filtered.length > initial ? (
        <button type="button" className="rank-more" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((value) => !value)}>
          {expanded ? `Show top ${initial}` : `Show all ${filtered.length}`}
        </button>
      ) : null}
    </div>
  );
}

/** Axis labels: round numbers without the row values' decimals. */
function tickLabel(tick: number, format: ValueFormat): string {
  if (format === "percent") return `${Math.round(tick * 100)}%`;
  if (format === "index" || format === "arena") return Number(tick.toPrecision(6)).toLocaleString("en-GB");
  return formatValue(tick, format);
}

function scaleFor(rows: ChartRow[], mode: "interval" | "bar", fixedMax?: number) {
  // Evenly spaced ticks from edge to edge, so gridlines can be one CSS background.
  const low = mode === "bar" ? 0 : Math.min(...rows.map((row) => row.low ?? row.value));
  const high = fixedMax ?? Math.max(...rows.map((row) => (mode === "bar" ? row.value : row.high ?? row.value)), low + Number.EPSILON);
  const rough = niceTicks(low, high, 4);
  const step = rough.length > 1 ? rough[1] - rough[0] : Math.max(Math.abs(high) * 0.25, 1e-9);
  const min = Math.floor(low / step) * step;
  const max = Math.max(Math.ceil(high / step - 1e-9) * step, min + step);
  const ticks: number[] = [];
  for (let index = 0; min + index * step <= max + step / 1e6; index += 1) ticks.push(Number((min + index * step).toPrecision(12)));
  return { min, max, ticks };
}
