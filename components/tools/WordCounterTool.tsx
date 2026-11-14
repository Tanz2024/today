"use client";

import { useState } from "react";
import { Eraser } from "@phosphor-icons/react";
import { textStats } from "@/lib/tools/everyday";
import { trackTool } from "@/lib/tools/analytics";

const LABELS: Record<keyof ReturnType<typeof textStats>, string> = { words: "Words", characters: "Characters", charactersNoSpaces: "Characters (no spaces)", sentences: "Sentences", paragraphs: "Paragraphs", minutes: "Min to read" };

export default function WordCounterTool() {
  const [text, setText] = useState("");
  const stats = textStats(text);
  return (
    <div className="utility-panel">
      <div className="utility-form">
        <label htmlFor="word-counter-input" className="utility-label">Your text</label>
        <textarea id="word-counter-input" value={text} onChange={(event) => setText(event.target.value)} rows={10} placeholder="Paste a draft or AI output here — it stays on this device." className="utility-textarea" />
        <div className="utility-actions">
          <p className="utility-count">Counted live in your browser · nothing is stored</p>
          <div className="utility-buttons"><button type="button" className="ui-button ui-button-ghost" disabled={!text} onClick={() => { setText(""); trackTool("tool_reset", "word-counter"); }}><Eraser size={16} aria-hidden="true" /> Clear</button></div>
        </div>
      </div>
      <dl aria-live="polite" className="card-grid card-grid-3">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
          <div key={key} className="d-card"><dt className="d-card-text">{LABELS[key]}</dt><dd className="d-feature-title">{stats[key].toLocaleString("en-US")}</dd></div>
        ))}
      </dl>
    </div>
  );
}
