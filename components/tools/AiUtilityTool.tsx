"use client";

import { useState } from "react";
import { Check, Copy, Eraser, Sparkle, WarningCircle } from "@phosphor-icons/react";
import type { AiUtility } from "@/lib/ai-utilities";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Input → server → output. `available` comes from the server render, so the
 * page never pretends a provider is connected. Output is shown only when the
 * API returns real model text.
 */
export default function AiUtilityTool({ tool, available }: { tool: Pick<AiUtility, "slug" | "inputLabel" | "placeholder" | "maxChars" | "minChars" | "outputLabel" | "actionLabel" | "options">; available: boolean }) {
  const [input, setInput] = useState("");
  const [option, setOption] = useState(tool.options.items[0].value);
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const length = input.trim().length;
  const tooShort = length < tool.minChars;
  const tooLong = input.length > tool.maxChars;

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!available || tooShort || tooLong || status === "loading") return;
    setStatus("loading");
    setError("");
    setOutput("");
    try {
      const response = await fetch(`/api/ai-utilities/${tool.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, option }) });
      const data = await response.json().catch(() => ({})) as { output?: string; error?: string };
      if (!response.ok || !data.output) throw new Error(data.error || "Something went wrong. Please try again.");
      setOutput(data.output);
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the text stays selectable */ }
  }

  function clear() {
    setInput("");
    setOutput("");
    setError("");
    setStatus("idle");
  }

  return (
    <div className="utility-panel">
      {!available ? (
        <div className="utility-notice" role="status">
          <WarningCircle size={18} weight="bold" aria-hidden="true" />
          <p><strong>This AI tool isn&apos;t switched on yet.</strong> The interface is ready, but no AI provider is connected on this site, so it can&apos;t generate results. Nothing you type is sent anywhere.</p>
        </div>
      ) : null}

      <form onSubmit={run} className="utility-form">
        <fieldset className="utility-options">
          <legend>{tool.options.label}</legend>
          {tool.options.items.map((item) => (
            <label key={item.value} className={`utility-chip ${option === item.value ? "is-active" : ""}`}>
              <input type="radio" name="option" value={item.value} checked={option === item.value} onChange={() => setOption(item.value)} className="sr-only" />
              {item.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor={`${tool.slug}-input`} className="utility-label">{tool.inputLabel}</label>
        <textarea
          id={`${tool.slug}-input`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={tool.placeholder}
          rows={tool.slug === "ai-prompt-improver" ? 6 : 10}
          spellCheck={tool.slug !== "ai-code-explainer"}
          className={`utility-textarea ${tool.slug === "ai-code-explainer" ? "is-code" : ""}`}
          aria-describedby={`${tool.slug}-count`}
        />
        <div className="utility-actions">
          <p id={`${tool.slug}-count`} className={`utility-count ${tooLong ? "is-error" : ""}`}>
            {input.length.toLocaleString("en-US")} / {tool.maxChars.toLocaleString("en-US")}
            {length > 0 && tooShort ? ` · at least ${tool.minChars} characters` : ""}
          </p>
          <div className="utility-buttons">
            <button type="button" onClick={clear} className="ui-button ui-button-ghost" disabled={!input && !output}>
              <Eraser size={16} aria-hidden="true" /> Clear
            </button>
            <button type="submit" className="ui-button ui-button-primary" disabled={!available || tooShort || tooLong || status === "loading"}>
              <Sparkle size={16} weight="bold" aria-hidden="true" /> {status === "loading" ? "Working…" : tool.actionLabel}
            </button>
          </div>
        </div>
      </form>

      <section className="utility-output" aria-live="polite" aria-busy={status === "loading"} aria-label={tool.outputLabel}>
        <div className="utility-output-head">
          <h2>{tool.outputLabel}</h2>
          {status === "done" ? (
            <button type="button" onClick={copy} className="ui-button ui-button-ghost ui-button-sm">
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
        {status === "loading" ? <div className="utility-skeleton" aria-hidden="true"><span /><span /><span /></div> : null}
        {status === "error" ? <p className="utility-error" role="alert">{error}</p> : null}
        {status === "done" ? <div className={`utility-result ${tool.slug === "ai-prompt-improver" ? "is-mono" : ""}`}>{output}</div> : null}
        {status === "idle" ? <p className="utility-placeholder">{available ? "Your result will appear here." : "Results will appear here once the tool is switched on."}</p> : null}
      </section>
      {status === "done" ? <p className="utility-disclaimer">AI output can be wrong or incomplete. Check it before you rely on it.</p> : null}
    </div>
  );
}
