"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eraser, FilePdf, PaperPlaneRight, WarningCircle } from "@phosphor-icons/react";
import Dropzone, { ProgressBar } from "./Dropzone";
import { releaseOcr } from "@/lib/ocr-client";
import { extractPdf, PdfError } from "@/lib/pdf-extract";
import { bm25 } from "@/lib/study/retrieve";
import { PDF_CONTEXT_CHARS, PDF_MAX_BYTES, PDF_MAX_PAGES } from "@/lib/local-ai-tools";

type Passage = { page: number; text: string };
type Doc = { name: string; pages: number; passages: Passage[]; ocrPages: number[]; skippedOcr: number };
type Mode = "summary" | "key-points" | "outline" | "ask" | "explain";

const PASSAGE_CHARS = 1_400;
const QUESTION_CONTEXT = 12_000;
/** Split each page's text into passages that keep their page number. */
function toPassages(page: number, text: string): Passage[] {
  const clean = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const out: Passage[] = [];
  for (let start = 0; start < clean.length; start += PASSAGE_CHARS) out.push({ page, text: clean.slice(start, start + PASSAGE_CHARS) });
  return out;
}

/** Keyword retrieval (BM25-style) for questions; even spread for summaries. */
function selectPassages(all: Passage[], mode: Mode, question: string): { passages: Passage[]; sampled: boolean } {
  const totalChars = all.reduce((sum, p) => sum + p.text.length, 0);
  if (mode === "summary" || mode === "key-points" || mode === "outline") {
    if (totalChars <= PDF_CONTEXT_CHARS) return { passages: all, sampled: false };
    const count = Math.floor(PDF_CONTEXT_CHARS / PASSAGE_CHARS);
    const step = all.length / count;
    return { passages: Array.from({ length: count }, (_, i) => all[Math.floor(i * step)]), sampled: true };
  }
  const scores = bm25(all.map((p) => p.text), question);
  const scored = all.map((passage, i) => ({ passage, score: scores[i], i }));
  const picked: typeof scored = [];
  let used = 0;
  for (const item of [...scored].sort((a, b) => b.score - a.score)) {
    if (item.score <= 0 || used + item.passage.text.length > QUESTION_CONTEXT) continue;
    picked.push(item);
    used += item.passage.text.length;
  }
  // Short documents: send everything so nothing relevant is missed.
  if (totalChars <= QUESTION_CONTEXT) return { passages: all, sampled: false };
  return { passages: (picked.length ? picked : scored.slice(0, 6)).sort((a, b) => a.i - b.i).map((item) => item.passage), sampled: false };
}

export default function PdfAssistant({ available }: { available: boolean }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "asking" | "error">("idle");
  const [progress, setProgress] = useState<{ label: string; value: number | null }>({ label: "", value: null });
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ label: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const cache = useRef(new Map<string, string>());

  useEffect(() => () => { void releaseOcr(); }, []);

  async function read(file: File) {
    setError("");
    setStatus("reading");
    setProgress({ label: "Opening PDF", value: null });
    cache.current.clear();
    setAnswer(null);
    try {
      const result = await extractPdf(file, (label, value) => setProgress({ label, value }));
      const passages = result.texts.flatMap((page) => toPassages(page.page, page.text));
      if (!passages.length) throw new PdfError("No readable text was found in this PDF.");
      setDoc({ name: result.name, pages: result.pages, passages, ocrPages: result.ocrPages, skippedOcr: result.skippedOcr });
      setStatus("idle");
    } catch (caught) {
      setError(caught instanceof PdfError ? caught.message : "This PDF couldn't be read. It may be damaged or in an unsupported format.");
      setStatus("error");
    }
  }

  async function ask(mode: Mode, label: string) {
    if (!doc || !available || status !== "idle") return;
    const q = mode === "ask" || mode === "explain" ? question.trim() : "";
    if ((mode === "ask" || mode === "explain") && q.length < 3) { setError("Type a question or the section you want explained."); return; }
    const key = `${mode}|${q}`;
    const title = q ? `${label}: ${q}` : label;
    if (cache.current.has(key)) { setAnswer({ label: title, text: cache.current.get(key)! }); return; }
    setStatus("asking");
    setError("");
    try {
      const { passages, sampled } = selectPassages(doc.passages, mode, q);
      const response = await fetch("/api/ai-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, question: q, passages, sampled }) });
      const data = (await response.json().catch(() => ({}))) as { output?: string; error?: string };
      if (!response.ok || !data.output) throw new Error(data.error || "Something went wrong. Please try again.");
      const text = sampled ? `${data.output}\n\n(Based on a spread of passages from this long document.)` : data.output;
      cache.current.set(key, text);
      setAnswer({ label: title, text });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  function clear() {
    setDoc(null);
    setAnswer(null);
    setQuestion("");
    setError("");
    cache.current.clear();
    setStatus("idle");
  }

  async function copy() {
    if (!answer) return;
    try { await navigator.clipboard.writeText(answer.text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* selectable */ }
  }

  const busy = status === "reading" || status === "asking";

  return (
    <div className="utility-panel lt-panel">
      {!available ? (
        <div className="utility-notice" role="status">
          <WarningCircle size={18} weight="bold" aria-hidden="true" />
          <p><strong>Setup required.</strong> Text extraction works on your device, but the AI model that writes summaries and answers isn&apos;t switched on for this site yet, so no answers can be generated.</p>
        </div>
      ) : null}

      {!doc ? (
        status === "reading" ? <ProgressBar label={progress.label} value={progress.value} /> : <Dropzone accept="application/pdf,.pdf" label="Choose a PDF" hint={`up to ${PDF_MAX_BYTES / 1024 / 1024} MB · ${PDF_MAX_PAGES} pages`} onFile={read} />
      ) : (
        <>
          <div className="lt-doc">
            <FilePdf size={26} weight="duotone" aria-hidden="true" />
            <div>
              <strong>{doc.name}</strong>
              <span className="lt-meta">{doc.pages} page{doc.pages === 1 ? "" : "s"}{doc.ocrPages.length ? ` · ${doc.ocrPages.length} scanned page${doc.ocrPages.length === 1 ? "" : "s"} read with OCR` : ""}{doc.skippedOcr ? ` · ${doc.skippedOcr} scanned page${doc.skippedOcr === 1 ? "" : "s"} skipped` : ""}</span>
            </div>
          </div>
          <div className="utility-options lt-actions-row">
            <button type="button" className="utility-chip" onClick={() => ask("summary", "Summary")} disabled={!available || busy}>Summary</button>
            <button type="button" className="utility-chip" onClick={() => ask("key-points", "Key points")} disabled={!available || busy}>Key points</button>
            <button type="button" className="utility-chip" onClick={() => ask("outline", "Outline")} disabled={!available || busy}>Outline</button>
          </div>
          <form className="lt-ask" onSubmit={(event) => { event.preventDefault(); void ask("ask", "Answer"); }}>
            <label htmlFor="pdf-q" className="sr-only">Ask about the document</label>
            <input id="pdf-q" className="utility-textarea lt-input" value={question} maxLength={600} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question, or name a section to explain…" disabled={busy} />
            <button type="button" className="ui-button ui-button-ghost" onClick={() => ask("explain", "Explanation")} disabled={!available || busy || question.trim().length < 3}>Explain</button>
            <button type="submit" className="ui-button ui-button-primary" disabled={!available || busy || question.trim().length < 3}><PaperPlaneRight size={16} weight="bold" aria-hidden="true" /> Ask</button>
          </form>
        </>
      )}

      {error ? <p className="utility-error" role="alert">{error}</p> : null}

      {doc ? (
        <section className="utility-output" aria-live="polite" aria-busy={status === "asking"} aria-label="Answer">
          <div className="utility-output-head">
            <h2>{answer?.label ?? "Answer"}</h2>
            {answer ? <button type="button" onClick={copy} className="ui-button ui-button-ghost ui-button-sm">{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? "Copied" : "Copy"}</button> : null}
          </div>
          {status === "asking" ? <div className="utility-skeleton" aria-hidden="true"><span /><span /><span /></div> : answer ? <div className="utility-result">{answer.text}</div> : <p className="utility-placeholder">Pick Summary, Key points or Outline, or ask a question.</p>}
        </section>
      ) : null}
      {answer ? <p className="utility-disclaimer">Answers come only from the document, with page references. AI can still misread — check important details in the PDF.</p> : null}

      <div className="utility-actions">
        <p className="utility-count">The PDF stays on your device</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-ghost" onClick={clear} disabled={!doc || busy}><Eraser size={16} aria-hidden="true" /> Clear document</button>
        </div>
      </div>
    </div>
  );
}
