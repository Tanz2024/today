"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowCounterClockwise, Check, CheckCircle, Copy, DownloadSimple, Eraser, MagicWand, Stop, WarningCircle, X } from "@phosphor-icons/react";
import ModelPanel from "./ModelPanel";
import DiffView from "./DiffView";
import CitationFinder from "./CitationFinder";
import { cancelGeneration, generate, useLlmState } from "@/lib/local-llm/client";
import { WRITING_MODES, cleanRewrite, joinSegments, splitSegments, writingMessages, type Segment, type WritingModeKey } from "@/lib/writing/modes";
import { applyFixes, easeLabel, lintText, readingEase } from "@/lib/text/lint";
import { addedProtected, describeItems, missingProtected } from "@/lib/text/guard";
import { similarity } from "@/lib/text/diff";
import { textStats } from "@/lib/tools/everyday";
import { copyText, downloadFile, textToHtmlDocument } from "@/lib/workspace-files";

const MAX_CHARS = 12_000;

type Piece = Segment & {
  input: string;
  output: string;
  status: "pending" | "working" | "done" | "failed";
  error?: string;
  decision: "undecided" | "accepted" | "rejected";
  missing: string;
  added: string;
  drift: boolean;
};

export default function WritingStudio() {
  const llm = useLlmState();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<WritingModeKey>("fix");
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [summary, setSummary] = useState<{ text: string; missing: string; added: string } | null>(null);
  const [live, setLive] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const stopRef = useRef(false);

  const stats = textStats(text);
  const ease = readingEase(text);
  const issues = useMemo(() => lintText(text), [text]);
  const fixable = issues.filter((issue) => issue.fix !== undefined);
  const ready = llm.phase === "ready" || llm.phase === "generating";
  const tooLong = text.length > MAX_CHARS;
  const activeMode = WRITING_MODES.find((m) => m.key === mode)!;

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 1800); }

  function fixAll() {
    let next = text;
    for (let pass = 0; pass < 3; pass += 1) {
      const found = lintText(next).filter((issue) => issue.fix !== undefined);
      if (!found.length) break;
      next = applyFixes(next, found);
    }
    setText(next);
  }

  async function run() {
    if (!ready || running || text.trim().length < 3 || tooLong) return;
    setError("");
    setSummary(null);
    setRunning(true);
    stopRef.current = false;
    try {
      if (activeMode.whole) {
        setPieces(null);
        setLive("");
        const result = await generate(writingMessages(activeMode, text.trim()), { maxNewTokens: 400, temperature: activeMode.temperature, onToken: (t) => setLive((s) => s + t) });
        const output = cleanRewrite(result.text);
        if (result.interrupted) throw new Error("Stopped before the summary finished. Nothing was kept.");
        if (!output) throw new Error("The model returned an empty result. Try again or use the Quality model.");
        setSummary({ text: output, missing: "", added: describeItems(addedProtected([text], output)) });
        return;
      }
      const segments = splitSegments(text);
      const initial: Piece[] = segments.map((segment) => ({ ...segment, input: segment.text, output: "", status: "pending", decision: "undecided", missing: "", added: "", drift: false }));
      setPieces(initial);
      for (let i = 0; i < initial.length; i += 1) {
        if (stopRef.current) break;
        const original = initial[i].text;
        // Grammar mode: unambiguous rule-based fixes go first, then the model.
        let input = original;
        if (mode === "fix") for (let pass = 0; pass < 3; pass += 1) { const found = lintText(input).filter((x) => x.fix !== undefined); if (!found.length) break; input = applyFixes(input, found); }
        setLive("");
        setPieces((list) => list && list.map((p, j) => (j === i ? { ...p, status: "working", input } : p)));
        try {
          const words = input.split(/\s+/).length;
          const result = await generate(writingMessages(activeMode, input), { maxNewTokens: Math.min(1_200, Math.ceil(words * 1.6 * activeMode.lengthFactor) + 40), temperature: activeMode.temperature, onToken: (t) => setLive((s) => s + t) });
          const output = cleanRewrite(result.text);
          if (result.interrupted) throw new Error("Stopped");
          if (!output) throw new Error("The model returned nothing for this paragraph.");
          const missing = missingProtected(original, output);
          const added = addedProtected([original], output);
          const drift = (mode === "fix" && similarity(original, output) < 0.6) || (mode !== "shorter" && mode !== "longer" && output.length > original.length * 2.2);
          const unchanged = output.trim() === original.trim();
          setPieces((list) => list && list.map((p, j) => (j === i ? { ...p, output, status: "done", missing: describeItems(missing), added: describeItems(added), drift, decision: unchanged ? "rejected" : "undecided" } : p)));
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Failed";
          setPieces((list) => list && list.map((p, j) => (j === i ? { ...p, status: "failed", error: message === "Stopped" ? "Stopped. The original is kept." : message } : p)));
          if (message !== "Stopped" && !/too long/i.test(message)) { setError(message); break; }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Processing failed. Nothing was changed.");
    } finally {
      setLive("");
      setRunning(false);
    }
  }

  function stop() { stopRef.current = true; cancelGeneration(); }
  const decide = (index: number, decision: Piece["decision"]) => setPieces((list) => list && list.map((p, j) => (j === index ? { ...p, decision } : p)));
  const decideAll = (decision: Piece["decision"]) => setPieces((list) => list && list.map((p) => (p.status === "done" && p.output.trim() !== p.text.trim() ? { ...p, decision } : p)));

  const merged = pieces ? joinSegments(pieces.map((p) => ({ text: p.status === "done" && p.decision === "accepted" ? p.output : p.text, sep: p.sep }))) : text;
  const accepted = pieces?.filter((p) => p.decision === "accepted").length ?? 0;
  const done = pieces?.filter((p) => p.status === "done").length ?? 0;
  const exportText = summary ? summary.text : merged;

  function applyToEditor() { setText(merged); setPieces(null); flash("Accepted changes applied to your text"); }

  async function copy(value: string) { flash((await copyText(value)) ? "Copied" : "Copy blocked: select the text instead"); }

  return (
    <div className="utility-panel ws">
      <ModelPanel purpose="Rewriting" />

      <div className="utility-form">
        <fieldset className="utility-options">
          <legend>Mode</legend>
          {WRITING_MODES.map((item) => (
            <label key={item.key} className={`utility-chip ${mode === item.key ? "is-active" : ""}`}>
              <input type="radio" name="writing-mode" value={item.key} checked={mode === item.key} onChange={() => setMode(item.key)} className="sr-only" disabled={running} />
              {item.label}
            </label>
          ))}
        </fieldset>
        <label htmlFor="ws-text" className="utility-label">Your text</label>
        <textarea id="ws-text" className="utility-textarea" rows={12} value={text} onChange={(event) => { setText(event.target.value); setPieces(null); setSummary(null); }} placeholder="Paste an essay, email, report or paragraph. It stays on this device." readOnly={running} aria-describedby="ws-stats" />
        <div className="utility-actions">
          <p id="ws-stats" className={`utility-count ${tooLong ? "is-error" : ""}`}>
            {stats.words.toLocaleString("en-US")} words · {stats.characters.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")} characters · {stats.minutes} min read{ease !== null ? ` · Reading ease ${ease} (${easeLabel(ease)})` : ""}
          </p>
          <div className="utility-buttons">
            <button type="button" className="ui-button ui-button-ghost" onClick={() => { setText(""); setPieces(null); setSummary(null); setError(""); }} disabled={!text || running}><Eraser size={16} aria-hidden="true" /> Clear</button>
            {running ? (
              <button type="button" className="ui-button ui-button-ghost" onClick={stop}><Stop size={16} weight="bold" aria-hidden="true" /> Stop</button>
            ) : (
              <button type="button" className="ui-button ui-button-primary" onClick={run} disabled={!ready || text.trim().length < 3 || tooLong} title={ready ? undefined : "Load the on-device model first"}><MagicWand size={16} weight="bold" aria-hidden="true" /> {activeMode.label}</button>
            )}
          </div>
        </div>
        {!ready ? <p className="ws-muted">Load the on-device model above to rewrite. The rule-based checks below work without it.</p> : null}
      </div>

      <section className="ws-card" aria-labelledby="ws-checks">
        <div className="utility-output-head">
          <h2 id="ws-checks">Rule-based checks · no AI</h2>
          {fixable.length ? <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={fixAll} disabled={running}><Check size={15} aria-hidden="true" /> Fix {fixable.length} automatically</button> : null}
        </div>
        {!text.trim() ? <p className="utility-placeholder">Spelling slips, repeated words, missing apostrophes, spacing, capitals and very long sentences are flagged here as you type.</p> : issues.length ? (
          <ul className="ws-issues">
            {issues.slice(0, 40).map((issue) => (
              <li key={`${issue.start}-${issue.rule}`}>
                <mark>{text.slice(issue.start, Math.min(issue.end, issue.start + 60))}{issue.end - issue.start > 60 ? "…" : ""}</mark> {issue.message}
                {issue.fix !== undefined ? <button type="button" className="ws-link" onClick={() => setText(applyFixes(text, [issue]))} disabled={running}>Fix</button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="utility-placeholder"><CheckCircle size={16} aria-hidden="true" /> No rule-based issues found. These rules catch common slips only, not every error.</p>}
      </section>

      {error ? <p className="utility-error" role="alert"><WarningCircle size={16} weight="bold" aria-hidden="true" /> {error}</p> : null}

      {summary || (running && activeMode.whole) ? (
        <section className="utility-output" aria-live="polite" aria-label="Summary">
          <div className="utility-output-head"><h2>Summary</h2>{summary ? <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => copy(summary.text)}><Copy size={15} aria-hidden="true" /> Copy</button> : null}</div>
          <div className="utility-result">{summary?.text ?? live}</div>
          {summary?.added ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Not found in your text: {summary.added}. Check these before using the summary.</p> : null}
        </section>
      ) : null}

      {pieces ? (
        <section className="ws-card" aria-labelledby="ws-compare" aria-live="polite">
          <div className="utility-output-head">
            <h2 id="ws-compare">Compare · {done} of {pieces.length} paragraph{pieces.length === 1 ? "" : "s"}{accepted ? ` · ${accepted} accepted` : ""}</h2>
            {!running && done ? (
              <div className="utility-buttons">
                <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => decideAll("rejected")}><X size={15} aria-hidden="true" /> Reject all</button>
                <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => decideAll("accepted")}><Check size={15} aria-hidden="true" /> Accept all</button>
              </div>
            ) : null}
          </div>
          <p className="ws-legend"><span className="ws-del">removed</span> <span className="ws-ins">added</span> · Nothing changes in your text until you accept it.</p>
          <ol className="ws-pieces">
            {pieces.map((piece, index) => (
              <li key={index} className={`ws-piece is-${piece.decision}`}>
                <div className="ws-sides">
                  <div><span className="ws-side-label">Original</span><p>{piece.text}</p></div>
                  <div>
                    <span className="ws-side-label">{activeMode.label}</span>
                    {piece.status === "done" ? <p><DiffView before={piece.text} after={piece.output} /></p> : piece.status === "working" ? <p className="ws-live">{live || "Working…"}</p> : piece.status === "failed" ? <p className="utility-error">{piece.error}</p> : <p className="ws-muted">Waiting…</p>}
                  </div>
                </div>
                {piece.status === "done" ? (
                  <>
                    {piece.missing ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Missing from the rewrite: {piece.missing}.</p> : null}
                    {piece.added ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Added by the model (not in your original): {piece.added}.</p> : null}
                    {piece.drift ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> This changed much more than the mode should. Read it carefully.</p> : null}
                    {piece.output.trim() === piece.text.trim() ? <p className="ws-muted">No changes suggested.</p> : (
                      <div className="ws-decide" role="group" aria-label={`Paragraph ${index + 1}`}>
                        <button type="button" aria-pressed={piece.decision === "accepted"} onClick={() => decide(index, "accepted")}><Check size={14} aria-hidden="true" /> Accept</button>
                        <button type="button" aria-pressed={piece.decision === "rejected"} onClick={() => decide(index, "rejected")}><X size={14} aria-hidden="true" /> Reject</button>
                      </div>
                    )}
                  </>
                ) : null}
              </li>
            ))}
          </ol>
          {!running && accepted ? <div className="utility-buttons"><button type="button" className="ui-button ui-button-primary" onClick={applyToEditor}><ArrowCounterClockwise size={16} aria-hidden="true" /> Apply {accepted} accepted change{accepted === 1 ? "" : "s"} to my text</button></div> : null}
        </section>
      ) : null}

      <div className="utility-actions">
        <p className="utility-count" aria-live="polite">{notice || "Export includes only accepted changes."}</p>
        <div className="utility-buttons ws-export">
          <button type="button" className="ui-button ui-button-ghost" onClick={() => copy(exportText)} disabled={!exportText.trim()}><Copy size={16} aria-hidden="true" /> Copy</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("todayai-text.txt", exportText)} disabled={!exportText.trim()}><DownloadSimple size={16} aria-hidden="true" /> .txt</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("todayai-text.md", exportText, "text/markdown")} disabled={!exportText.trim()}><DownloadSimple size={16} aria-hidden="true" /> .md</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("todayai-text.html", textToHtmlDocument("Document", exportText), "text/html")} disabled={!exportText.trim()}><DownloadSimple size={16} aria-hidden="true" /> Doc (.html)</button>
        </div>
      </div>
      <p className="utility-disclaimer">Small on-device models make mistakes and can miss errors. Every change is shown for you to accept or reject; warnings mark numbers, citations and terms that changed.</p>

      <CitationFinder onInsert={(reference) => setText((current) => `${current.trimEnd()}${/\n\s*References\s*\n/i.test(current) ? "\n" : "\n\nReferences\n"}${reference}`)} />
    </div>
  );
}
