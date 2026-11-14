"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Cards, CheckCircle, DownloadSimple, Eraser, FilePdf, MagnifyingGlass, PaperPlaneRight, Stop, WarningCircle, XCircle } from "@phosphor-icons/react";
import ModelPanel from "./ModelPanel";
import Dropzone, { ProgressBar } from "@/components/tools/local/Dropzone";
import { cancelGeneration, embed, generate, useLlmState } from "@/lib/local-llm/client";
import { EMBEDDING_MODEL } from "@/lib/local-llm/models";
import { extractPdf, PdfError } from "@/lib/pdf-extract";
import { hasEvidence, passageLabel, rank, toPassages, type Passage, type Ranked } from "@/lib/study/retrieve";
import { cardIsGrounded, cardMessages, checkAnswer, explainMessages, isAbstention, overlap, parseCards, qaMessages, reviewMessages } from "@/lib/study/grounding";
import { clozeCards, keyTerms, markShortAnswer, toMcqs, type Mcq, type StudyCard } from "@/lib/study/cloze";
import { addedProtected, describeItems } from "@/lib/text/guard";
import { downloadFile } from "@/lib/workspace-files";
import { PDF_MAX_BYTES, PDF_MAX_PAGES } from "@/lib/local-ai-tools";

type Material = { name: string; passages: Passage[]; pages: number | null; note: string };
type Tab = "ask" | "explain" | "cards" | "quiz" | "exam" | "export";
type Answer = { question: string; sources: Passage[]; text: string; status: "answered" | "abstained" | "unverified" | "search-only"; note: string; cited: number[] };

const CONTEXT_CHARS = 4_200;

function SourceList({ passages, cited }: { passages: Passage[]; cited?: number[] }) {
  return (
    <details open className="ws-entry">
      <summary className="ws-side-label">Source passages ({passages.length})</summary>
      {passages.map((p, i) => <p key={p.id} className="ws-source"><strong>[{i + 1}] {passageLabel(p)}{cited?.includes(i + 1) ? " · cited" : ""}</strong>{"\n"}{p.text}</p>)}
    </details>
  );
}

export default function StudyAssistant() {
  const llm = useLlmState();
  const ready = llm.phase === "ready" || llm.phase === "generating";
  const [material, setMaterial] = useState<Material | null>(null);
  const [pasted, setPasted] = useState("");
  const [progress, setProgress] = useState<{ label: string; value: number | null } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("ask");
  const [semantic, setSemantic] = useState<{ vectors: number[][] } | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState("");
  const [live, setLive] = useState("");
  const [explainId, setExplainId] = useState<number | null>(null);
  const [level, setLevel] = useState("a secondary-school student");
  const [explanation, setExplanation] = useState<{ id: number; text: string; warning: string } | null>(null);
  const [aiCards, setAiCards] = useState<StudyCard[]>([]);
  const [cardTopic, setCardTopic] = useState("");
  const [verify, setVerify] = useState(true);
  const [cardLog, setCardLog] = useState("");

  const passages = useMemo(() => material?.passages ?? [], [material]);
  const byId = useMemo(() => new Map(passages.map((p) => [p.id, p])), [passages]);
  const cloze = useMemo(() => clozeCards(passages, 30), [passages]);
  const pool = useMemo(() => keyTerms(passages).slice(0, 120), [passages]);
  const allCards = useMemo(() => [...aiCards, ...cloze], [aiCards, cloze]);

  function reset() {
    setMaterial(null); setSemantic(null); setAnswer(null); setExplanation(null); setAiCards([]); setPasted(""); setError(""); setCardLog("");
  }

  async function loadPdf(file: File) {
    setError("");
    setProgress({ label: "Opening PDF", value: null });
    try {
      const result = await extractPdf(file, (label, value) => setProgress({ label, value }));
      const list = toPassages(result.texts.map((t) => ({ page: t.page, text: t.text })));
      setMaterial({ name: result.name, passages: list, pages: result.pages, note: `${result.pages} pages${result.ocrPages.length ? ` · ${result.ocrPages.length} scanned pages read with OCR (check those)` : ""}${result.skippedOcr ? ` · ${result.skippedOcr} scanned pages skipped` : ""}` });
    } catch (caught) { setError(caught instanceof PdfError ? caught.message : "This PDF couldn't be read."); }
    finally { setProgress(null); }
  }

  function usePasted() {
    const text = pasted.trim();
    if (text.length < 200) { setError("Paste at least a few paragraphs of notes."); return; }
    setError("");
    setMaterial({ name: "Pasted notes", passages: toPassages([{ page: null, text }]), pages: null, note: "No page numbers (pasted text): passages are numbered instead" });
  }

  async function enableSemantic() {
    if (!material) return;
    setBusy("embed");
    setError("");
    setProgress({ label: `Indexing ${passages.length} passages with MiniLM (≈ ${EMBEDDING_MODEL.downloadMb} MB, first time only)`, value: null });
    try {
      const vectors = await embed(passages.map((p) => p.text), (done, total) => setProgress({ label: `Indexing passages ${done} of ${total}`, value: done / total }));
      setSemantic({ vectors });
    } catch { setError("Semantic search couldn't start on this device. Keyword search still works."); }
    finally { setBusy(""); setProgress(null); }
  }

  async function search(q: string): Promise<Ranked[]> {
    let vectors;
    if (semantic) { const [query] = await embed([q]); vectors = { passages: semantic.vectors, query }; }
    return rank(passages, q, vectors);
  }

  function pickContext(ranked: Ranked[]) {
    const chosen: Passage[] = [];
    let used = 0;
    for (const item of ranked.slice(0, 6)) {
      if (item.score <= 0.15 && chosen.length) break;
      if (used + item.passage.text.length > CONTEXT_CHARS && chosen.length) break;
      chosen.push(item.passage);
      used += item.passage.text.length;
    }
    return chosen;
  }

  async function ask(event?: React.FormEvent) {
    event?.preventDefault();
    const q = question.trim();
    if (!material || q.length < 3 || busy) return;
    setBusy("ask"); setError(""); setAnswer(null); setLive("");
    try {
      const ranked = await search(q);
      const sources = pickContext(ranked);
      if (!hasEvidence(ranked)) { setAnswer({ question: q, sources: ranked.slice(0, 2).map((r) => r.passage), text: "", status: "abstained", note: "Your material doesn't seem to cover this. The closest passages are below; nothing was generated.", cited: [] }); return; }
      if (!ready) { setAnswer({ question: q, sources, text: "", status: "search-only", note: "These are the most relevant passages. Load the on-device model to get a written answer from them.", cited: [] }); return; }
      const result = await generate(qaMessages(q, sources), { maxNewTokens: 220, onToken: (t) => setLive((s) => s + t) });
      if (result.interrupted) throw new Error("Stopped. No answer was kept.");
      if (!result.text || isAbstention(result.text)) { setAnswer({ question: q, sources, text: "", status: "abstained", note: "The assistant found no answer to this in the passages below, so it didn't guess.", cited: [] }); return; }
      const checked = checkAnswer(result.text, sources);
      if (!checked.cited.length || checked.support < 0.35) { setAnswer({ question: q, sources, text: "", status: "abstained", note: "The model's answer couldn't be matched to your material, so it isn't shown. Read the passages below instead.", cited: [] }); return; }
      const warn = [checked.support < 0.6 ? "Parts of this answer use words not found in the cited passages." : "", checked.sentencesWithoutCitation ? `${checked.sentencesWithoutCitation} sentence(s) have no source number.` : "", checked.invalidCitations.length ? "Invalid source numbers were removed." : ""].filter(Boolean).join(" ");
      setAnswer({ question: q, sources, text: checked.text, status: warn ? "unverified" : "answered", note: warn, cited: checked.cited });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Answering failed."); }
    finally { setBusy(""); setLive(""); }
  }

  async function explain() {
    const passage = explainId ? byId.get(explainId) : null;
    if (!passage || !ready || busy) return;
    setBusy("explain"); setError(""); setExplanation(null); setLive("");
    try {
      const result = await generate(explainMessages(passage.text, level), { maxNewTokens: 260, temperature: 0.2, onToken: (t) => setLive((s) => s + t) });
      if (result.interrupted || !result.text) throw new Error("No explanation was produced.");
      const added = addedProtected([passage.text], result.text);
      setExplanation({ id: passage.id, text: result.text, warning: added.length ? describeItems(added) : "" });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Explaining failed."); }
    finally { setBusy(""); setLive(""); }
  }

  async function makeAiCards() {
    if (!ready || busy || !material) return;
    setBusy("cards"); setError("");
    const scope = cardTopic.trim() ? (await search(cardTopic.trim())).filter((r) => r.score > 0.2).slice(0, 6).map((r) => r.passage) : passages.filter((p) => p.text.length > 250).slice(0, 6);
    if (!scope.length) { setError("No passages match that topic. Try other words, or leave it empty."); setBusy(""); return; }
    let kept = 0, dropped = 0;
    try {
      for (let i = 0; i < scope.length; i += 1) {
        const passage = scope[i];
        setCardLog(`Writing cards from ${passageLabel(passage)} (${i + 1} of ${scope.length})…`);
        const result = await generate(cardMessages(passage.text, 3), { maxNewTokens: 260 });
        if (result.interrupted) break;
        for (const card of parseCards(result.text)) {
          if (!cardIsGrounded(card, passage.text)) { dropped += 1; continue; }
          if (verify) {
            // Independent re-answer from the passage; keep the card only if it agrees.
            const check = await generate(qaMessages(card.q, [passage]), { maxNewTokens: 80 });
            if (check.interrupted) break;
            if (isAbstention(check.text) || overlap(card.a, [check.text]) < 0.5) { dropped += 1; continue; }
          }
          kept += 1;
          setAiCards((list) => [...list, { id: `a${passage.id}-${list.length}`, q: card.q, a: card.a, passageId: passage.id, origin: "ai" }]);
        }
      }
      setCardLog(`${kept} card${kept === 1 ? "" : "s"} kept${dropped ? `, ${dropped} discarded because they didn't match their source passage` : ""}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Card generation failed."); setCardLog(""); }
    finally { setBusy(""); }
  }

  const tabs: [Tab, string][] = [["ask", "Ask"], ["explain", "Explain"], ["cards", "Flashcards"], ["quiz", "Quiz"], ["exam", "Practice exam"], ["export", "Export"]];

  return (
    <div className="utility-panel ws">
      <ModelPanel purpose="Answering and question writing" />

      {!material ? (
        <div className="ws ws-card">
          {progress ? <ProgressBar label={progress.label} value={progress.value} /> : <Dropzone accept="application/pdf,.pdf" label="Choose a PDF" hint={`up to ${PDF_MAX_BYTES / 1024 / 1024} MB · ${PDF_MAX_PAGES} pages`} onFile={loadPdf} />}
          <label className="ws-field">…or paste your notes<textarea rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste lecture notes, a chapter or an article (at least a few paragraphs)." /></label>
          <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-primary" onClick={usePasted} disabled={pasted.trim().length < 200}>Use these notes</button></div>
        </div>
      ) : (
        <div className="lt-doc">
          <FilePdf size={26} weight="duotone" aria-hidden="true" />
          <div>
            <strong>{material.name}</strong>
            <span className="lt-meta">{material.note} · {passages.length} passages · {semantic ? "semantic + keyword search" : "keyword search"}</span>
          </div>
        </div>
      )}
      {error ? <p className="utility-error" role="alert"><WarningCircle size={16} aria-hidden="true" /> {error}</p> : null}

      {material ? (
        <>
          <div className="utility-actions">
            {!semantic ? <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={enableSemantic} disabled={Boolean(busy)}><MagnifyingGlass size={15} aria-hidden="true" /> Improve search with MiniLM (≈ {EMBEDDING_MODEL.downloadMb} MB, on device)</button> : <span className="utility-count">Semantic search on</span>}
            <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={reset} disabled={Boolean(busy)}><Eraser size={15} aria-hidden="true" /> Use different material</button>
          </div>
          {progress ? <ProgressBar label={progress.label} value={progress.value} /> : null}
          <div className="ws-tabs" role="tablist" aria-label="Study tools">
            {tabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}
          </div>

          {tab === "ask" ? (
            <div className="ws ws-card" role="tabpanel">
              <form className="lt-ask" onSubmit={ask}>
                <label htmlFor="study-q" className="sr-only">Question about your material</label>
                <input id="study-q" className="utility-textarea lt-input" value={question} maxLength={400} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about your material…" disabled={Boolean(busy)} />
                {busy === "ask" ? <button type="button" className="ui-button ui-button-ghost" onClick={cancelGeneration}><Stop size={16} aria-hidden="true" /> Stop</button> : <button type="submit" className="ui-button ui-button-primary" disabled={question.trim().length < 3 || Boolean(busy)}><PaperPlaneRight size={16} weight="bold" aria-hidden="true" /> {ready ? "Ask" : "Find passages"}</button>}
              </form>
              {busy === "ask" ? <div className="utility-result ws-live">{live || "Searching your material…"}</div> : null}
              {answer ? (
                <section aria-live="polite" className="ws">
                  {answer.status === "answered" || answer.status === "unverified" ? (
                    <>
                      <div className="utility-result">{answer.text.replace(/\[(\d+)\]/g, (m, n) => { const p = answer.sources[Number(n) - 1]; return p ? `[${n} · ${passageLabel(p)}]` : m; })}</div>
                      {answer.note ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> {answer.note} Check against the passages.</p> : <p className="ws-ok"><CheckCircle size={15} aria-hidden="true" /> Every sentence cites a passage, and its wording matches the cited text.</p>}
                    </>
                  ) : <p className={answer.status === "abstained" ? "ws-warn" : "ws-muted"}>{answer.status === "abstained" ? <WarningCircle size={15} aria-hidden="true" /> : null} {answer.note}</p>}
                  <SourceList passages={answer.sources} cited={answer.cited} />
                </section>
              ) : <p className="utility-placeholder">Answers come only from your material and show their source passages{material.pages ? " with page numbers" : ""}. If your material doesn&apos;t cover a question, the assistant says so.</p>}
            </div>
          ) : null}

          {tab === "explain" ? (
            <div className="ws ws-card" role="tabpanel">
              <label className="ws-field">Passage to explain
                <select value={explainId ?? ""} onChange={(e) => { setExplainId(Number(e.target.value) || null); setExplanation(null); }}>
                  <option value="">Choose a passage…</option>
                  {passages.map((p) => <option key={p.id} value={p.id}>{passageLabel(p)} · {p.text.slice(0, 80)}…</option>)}
                </select>
              </label>
              <label className="ws-field">Explain for
                <select value={level} onChange={(e) => setLevel(e.target.value)}><option value="a secondary-school student">A school student</option><option value="a first-year university student">A first-year university student</option><option value="someone completely new to the subject">A complete beginner</option></select>
              </label>
              <div className="utility-buttons ws-start">{busy === "explain" ? <button type="button" className="ui-button ui-button-ghost" onClick={cancelGeneration}><Stop size={16} aria-hidden="true" /> Stop</button> : <button type="button" className="ui-button ui-button-primary" onClick={explain} disabled={!ready || !explainId || Boolean(busy)}>Explain simply</button>}</div>
              {!ready ? <p className="ws-muted">Load the on-device model to get explanations.</p> : null}
              {busy === "explain" ? <div className="utility-result ws-live">{live || "Working on device…"}</div> : null}
              {explanation ? (
                <>
                  <div className="utility-result">{explanation.text}</div>
                  {explanation.warning ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Not in the passage: {explanation.warning}. Treat with caution.</p> : null}
                  <SourceList passages={[byId.get(explanation.id)!]} />
                </>
              ) : explainId ? <SourceList passages={[byId.get(explainId)!]} /> : null}
            </div>
          ) : null}

          {tab === "cards" ? (
            <div className="ws ws-card" role="tabpanel">
              <p className="ws-muted"><strong>{cloze.length} fill-in-the-blank cards</strong> were made from your material without AI: each hides a key term from a real sentence.{aiCards.length ? ` Plus ${aiCards.length} AI question cards.` : ""}</p>
              <div className="ws-entry">
                <span className="ws-side-label">AI question cards (on device)</span>
                <label className="ws-field">Topic (optional)<input value={cardTopic} onChange={(e) => setCardTopic(e.target.value)} placeholder="e.g. Calvin cycle. Leave empty to use the first passages." /></label>
                <label className="ws-consent"><input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} /> Double-check each card by re-answering it from its passage (slower, more accurate)</label>
                <div className="utility-buttons ws-start">{busy === "cards" ? <button type="button" className="ui-button ui-button-ghost" onClick={cancelGeneration}><Stop size={16} aria-hidden="true" /> Stop</button> : <button type="button" className="ui-button ui-button-primary" onClick={makeAiCards} disabled={!ready || Boolean(busy)}><Cards size={16} aria-hidden="true" /> Generate cards</button>}</div>
                {cardLog ? <p className="ws-muted" aria-live="polite">{cardLog}</p> : null}
              </div>
              <FlashcardDeck cards={allCards} byId={byId} />
            </div>
          ) : null}

          {tab === "quiz" ? <Quiz cards={allCards} pool={pool} byId={byId} /> : null}
          {tab === "exam" ? <PracticeExam cards={allCards} byId={byId} ready={ready} /> : null}

          {tab === "export" ? (
            <div className="ws ws-card" role="tabpanel">
              <p className="ws-muted">Files are created on your device. Source references are included with every item.</p>
              <div className="utility-buttons ws-start ws-export">
                <button type="button" className="ui-button ui-button-ghost" disabled={!allCards.length} onClick={() => downloadFile("flashcards-anki.txt", allCards.map((c) => [c.q, c.a, passageLabel(byId.get(c.passageId)!)].map((v) => v.replace(/[\t\n]+/g, " ")).join("\t")).join("\n"))}><DownloadSimple size={16} aria-hidden="true" /> Flashcards (Anki/Quizlet .txt)</button>
                <button type="button" className="ui-button ui-button-ghost" disabled={!allCards.length} onClick={() => downloadFile("flashcards.csv", ["question,answer,source", ...allCards.map((c) => [c.q, c.a, passageLabel(byId.get(c.passageId)!)].map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n"), "text/csv")}><DownloadSimple size={16} aria-hidden="true" /> Flashcards (.csv)</button>
                <button type="button" className="ui-button ui-button-ghost" disabled={!allCards.length} onClick={() => { const quiz = toMcqs(allCards, pool); downloadFile("quiz.md", `# Quiz: ${material.name}\n\n${quiz.map((m, i) => `${i + 1}. ${m.q}\n${m.options.map((o, j) => `   ${"ABCD"[j]}. ${o}`).join("\n")}`).join("\n\n")}\n\n## Answers\n\n${quiz.map((m, i) => `${i + 1}. ${"ABCD"[m.answer]} (${passageLabel(byId.get(m.passageId)!)})`).join("\n")}\n`, "text/markdown"); }}><DownloadSimple size={16} aria-hidden="true" /> Quiz with answer key (.md)</button>
                <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("study-sheet.md", `# Study sheet: ${material.name}\n\n${answer?.text ? `## Q: ${answer.question}\n\n${answer.text}\n\n` : ""}${explanation ? `## Explanation (${passageLabel(byId.get(explanation.id)!)})\n\n${explanation.text}\n\n` : ""}## Key questions\n\n${allCards.map((c) => `- **${c.q}** ${c.a} _(${passageLabel(byId.get(c.passageId)!)})_`).join("\n")}\n`, "text/markdown")}><DownloadSimple size={16} aria-hidden="true" /> Study sheet (.md)</button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      <p className="utility-disclaimer">Generated answers and questions are checked against your material, but small on-device models still make mistakes. Use the source passages to confirm anything you&apos;ll rely on in an exam.</p>
    </div>
  );
}

function FlashcardDeck({ cards, byId }: { cards: StudyCard[]; byId: Map<number, Passage> }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (!cards.length) return <p className="utility-placeholder">No cards yet. Longer material gives more cards.</p>;
  const card = cards[Math.min(index, cards.length - 1)];
  const go = (delta: number) => { setIndex((i) => (i + delta + cards.length) % cards.length); setFlipped(false); };
  return (
    <div className="ws">
      <button type="button" className="ws-flash" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Show question" : "Show answer"}>
        <span>{flipped ? <strong>{card.a}</strong> : card.q}<br /><span className="ws-muted">{flipped ? `Source: ${passageLabel(byId.get(card.passageId)!)} · ${card.origin === "ai" ? "AI card" : "fill-in-the-blank"}` : "Tap to reveal"}</span></span>
      </button>
      <div className="utility-actions">
        <p className="utility-count">Card {Math.min(index, cards.length - 1) + 1} of {cards.length}</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => go(-1)}><ArrowLeft size={15} aria-hidden="true" /> Previous</button>
          <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => go(1)}>Next <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      </div>
      {flipped ? <SourceList passages={[byId.get(card.passageId)!]} /> : null}
    </div>
  );
}

function Quiz({ cards, pool, byId }: { cards: StudyCard[]; pool: string[]; byId: Map<number, Passage> }) {
  const [seed, setSeed] = useState(7);
  const questions: Mcq[] = useMemo(() => toMcqs(cards, pool, seed).slice(0, 10), [cards, pool, seed]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  if (questions.length < 2) return <div className="ws-card" role="tabpanel"><p className="utility-placeholder">Not enough distinct key terms to build a quiz. Add more material or generate AI cards first.</p></div>;
  const score = questions.filter((q) => picks[q.id] === q.answer).length;
  return (
    <div className="ws ws-card" role="tabpanel">
      <p className="ws-muted">Each correct option is the exact term from your material; wrong options are other terms from the same material. {questions.length} questions.</p>
      <ol className="ws-pieces">
        {questions.map((q, i) => (
          <li key={q.id} className="ws-piece">
            <fieldset>
              <legend><strong>{i + 1}.</strong> {q.q}</legend>
              <div className="ws">
                {q.options.map((option, j) => {
                  const state = submitted ? (j === q.answer ? "is-right" : picks[q.id] === j ? "is-wrong" : "") : "";
                  return <label key={j} className={`ws-quiz-opt ${state}`}><input type="radio" name={q.id} checked={picks[q.id] === j} disabled={submitted} onChange={() => setPicks((p) => ({ ...p, [q.id]: j }))} /> {option}</label>;
                })}
              </div>
            </fieldset>
            {submitted ? <SourceList passages={[byId.get(q.passageId)!]} /> : null}
          </li>
        ))}
      </ol>
      <div className="utility-actions">
        <p className="utility-count" aria-live="polite">{submitted ? `Score: ${score} of ${questions.length}` : `${Object.keys(picks).length} of ${questions.length} answered`}</p>
        <div className="utility-buttons">
          {submitted ? <button type="button" className="ui-button ui-button-primary" onClick={() => { setSubmitted(false); setPicks({}); setSeed((s) => s + 1); }}>New quiz</button> : <button type="button" className="ui-button ui-button-primary" onClick={() => setSubmitted(true)} disabled={!Object.keys(picks).length}>Check answers</button>}
        </div>
      </div>
    </div>
  );
}

function PracticeExam({ cards, byId, ready }: { cards: StudyCard[]; byId: Map<number, Passage>; ready: boolean }) {
  const questions = useMemo(() => [...cards.filter((c) => c.origin === "ai"), ...cards.filter((c) => c.origin === "cloze")].slice(0, 8), [cards]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, { rule: string; ai?: string }>>({});
  const [busy, setBusy] = useState(false);
  if (!questions.length) return <div className="ws-card" role="tabpanel"><p className="utility-placeholder">No questions yet. Add more material or generate AI cards.</p></div>;

  async function markAll() {
    const next: Record<string, { rule: string; ai?: string }> = {};
    for (const q of questions) next[q.id] = { rule: markShortAnswer(answers[q.id] ?? "", q.a) };
    setMarks(next);
    if (!ready) return;
    setBusy(true);
    try {
      for (const q of questions) {
        const typed = (answers[q.id] ?? "").trim();
        if (!typed) continue;
        const result = await generate(reviewMessages(q.q.replace("_____", "(blank)"), q.a, byId.get(q.passageId)!.text, typed), { maxNewTokens: 70 });
        if (result.interrupted) break;
        if (/^(CORRECT|PARTLY|INCORRECT)\b/.test(result.text)) setMarks((m) => ({ ...m, [q.id]: { ...m[q.id], ai: result.text } }));
      }
    } catch { /* deterministic marks still shown */ }
    finally { setBusy(false); }
  }

  const icon = (mark: string) => (mark === "correct" ? <CheckCircle size={15} aria-hidden="true" /> : mark === "partly" ? <WarningCircle size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />);
  return (
    <div className="ws ws-card" role="tabpanel">
      <p className="ws-muted">Write your answers, then mark them. Word-match marking always runs; with the model loaded you also get AI feedback, labelled as such.</p>
      <ol className="ws-pieces">
        {questions.map((q, i) => (
          <li key={q.id} className="ws-piece">
            <label className="ws-field"><span><strong>{i + 1}.</strong> {q.q.includes("_____") ? `Fill the blank: ${q.q}` : q.q}</span><textarea value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} rows={2} /></label>
            {marks[q.id] ? (
              <>
                <p className={marks[q.id].rule === "correct" ? "ws-ok" : "ws-warn"}>{icon(marks[q.id].rule)} Word match: {marks[q.id].rule}. Reference answer: <strong>{q.a}</strong></p>
                {marks[q.id].ai ? <p className="ws-muted">AI feedback: {marks[q.id].ai}</p> : null}
                <SourceList passages={[byId.get(q.passageId)!]} />
              </>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="utility-buttons"><button type="button" className="ui-button ui-button-primary" onClick={markAll} disabled={busy}>{busy ? "Marking on device…" : "Mark my answers"}</button>{busy ? <button type="button" className="ui-button ui-button-ghost" onClick={cancelGeneration}><Stop size={16} aria-hidden="true" /> Stop</button> : null}</div>
    </div>
  );
}
