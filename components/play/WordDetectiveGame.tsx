"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, Brain, Flag, Lightbulb, MagnifyingGlass, ShareNetwork } from "@phosphor-icons/react";
import { HINT_AFTER, WORD_DETECTIVE_MODEL, closeness, cosine, dailyPuzzle, dayKey, isSolved, normalizeGuess, randomPuzzle, temperature, validateGuess, type Puzzle } from "@/lib/play/word-detective";

type Guess = { word: string; score: number; order: number };
type Mode = "daily" | "practice";
type ModelState = "idle" | "loading" | "ready" | "error";
type Embed = (text: string) => Promise<Float32Array>;

const STORAGE_KEY = "freshscene:play:word-detective";

function readStore(): Record<string, { guesses: Guess[]; status: "solved" | "revealed" }> {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}
function writeStore(day: string, guesses: Guess[], status: "solved" | "revealed") {
  try {
    const store = readStore();
    store[day] = { guesses, status };
    const keys = Object.keys(store).sort().slice(-14);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keys.map((key) => [key, store[key]]))));
  } catch { /* storage optional */ }
}

// The daily word depends on today's date, so render only after mount: a
// statically generated page would otherwise ship a stale puzzle.
export default function WordDetectiveGame() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  if (!mounted) return <div className="wd wd-loading" aria-busy="true"><p className="wd-note">Loading today&apos;s puzzle…</p></div>;
  return <WordDetective daily={dailyPuzzle()} />;
}

function WordDetective({ daily }: { daily: ReturnType<typeof dailyPuzzle> }) {
  const [mode, setMode] = useState<Mode>("daily");
  const [puzzle, setPuzzle] = useState<Puzzle>(daily.puzzle);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [status, setStatus] = useState<"playing" | "solved" | "revealed">("playing");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [latest, setLatest] = useState<Guess | null>(null);
  const [shared, setShared] = useState(false);
  const embedRef = useRef<Promise<Embed> | null>(null);
  const targetRef = useRef<{ word: string; vector: Float32Array } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore today's finished daily game.
  useEffect(() => {
    const saved = readStore()[dayKey()];
    if (saved) queueMicrotask(() => { setGuesses(saved.guesses); setStatus(saved.status); });
  }, []);

  function loadModel(): Promise<Embed> {
    if (!embedRef.current) {
      setModelState("loading");
      embedRef.current = import("@huggingface/transformers").then(async ({ pipeline }) => {
        const extractor = await pipeline("feature-extraction", WORD_DETECTIVE_MODEL, { dtype: "q8" });
        const embed: Embed = async (text) => {
          const output = await extractor(text, { pooling: "mean", normalize: true });
          return output.data as Float32Array;
        };
        setModelState("ready");
        return embed;
      }).catch((error) => {
        embedRef.current = null;
        setModelState("error");
        throw error;
      });
    }
    return embedRef.current;
  }

  async function targetVector(embed: Embed) {
    if (targetRef.current?.word !== puzzle.word) targetRef.current = { word: puzzle.word, vector: await embed(puzzle.word) };
    return targetRef.current.vector;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== "playing" || busy) return;
    const guess = normalizeGuess(input);
    const problem = validateGuess(guess, guesses.map((item) => item.word));
    if (problem) { setMessage(problem); return; }
    setBusy(true);
    setMessage("");
    try {
      const order = guesses.length + 1;
      let score: number;
      if (isSolved(guess, puzzle.word)) {
        score = 100;
      } else {
        const embed = await loadModel();
        const [target, vector] = await Promise.all([targetVector(embed), embed(guess)]);
        score = closeness(cosine(target, vector));
      }
      const entry = { word: guess, score, order };
      const next = [...guesses, entry];
      setGuesses(next);
      setLatest(entry);
      setInput("");
      if (score === 100) {
        setStatus("solved");
        if (mode === "daily") writeStore(dayKey(), next, "solved");
      }
    } catch {
      setMessage("The AI model couldn't load, so this guess wasn't scored. Check your connection and try again.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function giveUp() {
    setStatus("revealed");
    if (mode === "daily") writeStore(dayKey(), guesses, "revealed");
  }

  function newPractice() {
    setMode("practice");
    setPuzzle(randomPuzzle(puzzle.word));
    setGuesses([]);
    setLatest(null);
    setStatus("playing");
    setMessage("");
    setShared(false);
    inputRef.current?.focus();
  }

  function backToDaily() {
    const saved = readStore()[dayKey()];
    setMode("daily");
    setPuzzle(daily.puzzle);
    setGuesses(saved?.guesses ?? []);
    setStatus(saved?.status ?? "playing");
    setLatest(null);
    setMessage("");
  }

  async function share() {
    const text = `AI Word Detective #${daily.number}: ${status === "solved" ? `solved in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}` : "stumped me today"}. ${window.location.origin}/play/word-detective`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShared(true); }
    } catch { /* cancelled */ }
  }

  const sorted = [...guesses].sort((a, b) => b.score - a.score || a.order - b.order);
  const count = guesses.length;
  const best = sorted[0];

  return (
    <div className="wd">
      <div className="wd-bar">
        <p className="wd-mode">{mode === "daily" ? <>Daily puzzle <strong>#{daily.number}</strong></> : <>Practice round</>}</p>
        <p className="wd-stats"><span>{count} {count === 1 ? "guess" : "guesses"}</span>{best ? <span>Best {best.score}</span> : null}</p>
      </div>

      {status === "playing" ? (
        <form onSubmit={submit} className="wd-form">
          <label htmlFor="wd-guess" className="sr-only">Your guess</label>
          <input
            ref={inputRef}
            id="wd-guess"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a word…"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={24}
            enterKeyHint="go"
            className="wd-input"
          />
          <button type="submit" className="ui-button ui-button-primary wd-submit" disabled={busy || !input.trim()}>
            <MagnifyingGlass size={16} weight="bold" aria-hidden="true" /> {busy ? (modelState === "loading" ? "Loading AI…" : "Scoring…") : "Guess"}
          </button>
        </form>
      ) : null}

      <div aria-live="polite" className="wd-live">
        {modelState === "loading" ? <p className="wd-note"><Brain size={16} aria-hidden="true" /> Loading the language model (about 25 MB, first time only)…</p> : null}
        {message ? <p className="wd-message" role="alert">{message}</p> : null}
        {latest && status === "playing" ? <p className="wd-latest">“{latest.word}” is <strong className={`wd-tone-${temperature(latest.score).tone}`}>{temperature(latest.score).label.toLowerCase()}</strong> — closeness {latest.score}</p> : null}
      </div>

      {status !== "playing" ? (
        <div className={`wd-result ${status === "solved" ? "is-solved" : ""}`}>
          <p className="eyebrow">{status === "solved" ? "Solved" : "The word was"}</p>
          <p className="wd-answer">{puzzle.word}</p>
          <p className="wd-note">{status === "solved" ? `You found it in ${count} ${count === 1 ? "guess" : "guesses"}.` : `You made ${count} ${count === 1 ? "guess" : "guesses"}. Your closest was ${best ? `“${best.word}”` : "—"}.`}</p>
          <div className="wd-result-actions">
            {mode === "daily" ? <button type="button" onClick={share} className="ui-button ui-button-secondary"><ShareNetwork size={16} aria-hidden="true" /> {shared ? "Copied" : "Share result"}</button> : null}
            <button type="button" onClick={newPractice} className="ui-button ui-button-primary"><ArrowClockwise size={16} aria-hidden="true" /> {mode === "daily" ? "Play a practice word" : "New word"}</button>
          </div>
        </div>
      ) : null}

      {status === "playing" && count >= HINT_AFTER.category ? (
        <ul className="wd-hints" aria-label="Hints">
          <li><Lightbulb size={15} aria-hidden="true" /> Category: <strong>{puzzle.hint}</strong></li>
          {count >= HINT_AFTER.firstLetter ? <li><Lightbulb size={15} aria-hidden="true" /> Starts with <strong>{puzzle.word[0].toUpperCase()}</strong></li> : null}
          {count >= HINT_AFTER.length ? <li><Lightbulb size={15} aria-hidden="true" /> <strong>{puzzle.word.length}</strong> letters</li> : null}
        </ul>
      ) : null}

      {sorted.length ? (
        <ol className="wd-list" aria-label="Your guesses, closest first">
          {sorted.map((guess) => {
            const t = temperature(guess.score);
            return (
              <li key={guess.word} className={`wd-row ${latest?.word === guess.word ? "is-latest" : ""}`}>
                <span className="wd-row-order">#{guess.order}</span>
                <span className="wd-row-word">{guess.word}</span>
                <span className="wd-meter" aria-hidden="true"><span className={`wd-meter-fill wd-fill-${t.tone}`} style={{ width: `${Math.max(4, guess.score)}%` }} /></span>
                <span className={`wd-row-score wd-tone-${t.tone}`}>{guess.score}<span className="sr-only"> ({t.label})</span></span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="wd-empty">Start with any word. Each guess gets a closeness score from 0 to 100 based on how similar its meaning is to the secret word.</p>
      )}

      <div className="wd-controls">
        {status === "playing" && count > 0 ? <button type="button" onClick={giveUp} className="ui-button ui-button-ghost"><Flag size={16} aria-hidden="true" /> Reveal answer</button> : null}
        {status === "playing" && mode === "daily" ? <button type="button" onClick={newPractice} className="ui-button ui-button-ghost"><ArrowClockwise size={16} aria-hidden="true" /> Practice word</button> : null}
        {mode === "practice" ? <button type="button" onClick={backToDaily} className="ui-button ui-button-ghost">Back to today&apos;s puzzle</button> : null}
        {mode === "practice" && status === "playing" ? <button type="button" onClick={newPractice} className="ui-button ui-button-ghost"><ArrowClockwise size={16} aria-hidden="true" /> Restart with a new word</button> : null}
      </div>
    </div>
  );
}
