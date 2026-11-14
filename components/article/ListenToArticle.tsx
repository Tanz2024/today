"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, SkipBack, SkipForward, SpeakerHigh, Stop } from "@phosphor-icons/react";
import { pickReadingVoice, speechChunks } from "@/lib/article-speech";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;
const RATE_KEY = "todayai:listen-rate";

type Status = "idle" | "playing" | "paused";

/**
 * "Listen" for articles, using the browser's built-in text-to-speech
 * (Web Speech API). Nothing is sent to a server and no audio is generated in
 * advance. The text is read in short chunks so long articles don't stall,
 * and pausing remembers the position. Renders nothing in browsers without
 * speech synthesis.
 *
 * Rendered inside the article's Save / Share row: the button sits in the row
 * and the player wraps onto its own line below it. When the player scrolls out
 * of view while audio is active, a compact floating control appears.
 */
export default function ListenToArticle({ paragraphs }: { paragraphs: string[] }) {
  const chunks = useMemo(() => speechChunks(paragraphs), [paragraphs]);
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  // Saved speed. Safe to read on first render: the player renders nothing until
  // after mount (`supported`), so server and client markup can't disagree.
  const [rate, setRate] = useState<number>(() => {
    try {
      const saved = typeof window === "undefined" ? NaN : Number(localStorage.getItem(RATE_KEY));
      return (RATES as readonly number[]).includes(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  const [panelVisible, setPanelVisible] = useState(true);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const run = useRef(0); // bumps on every start/stop so stale "end" events are ignored
  const indexRef = useRef(0);
  const rateRef = useRef(rate);
  const panel = useRef<HTMLDivElement>(null);

  // Feature detection and voice list (Chrome loads voices asynchronously).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    const synth = window.speechSynthesis;
    const loadVoices = () => { voice.current = pickReadingVoice(synth.getVoices()); };
    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);
    queueMicrotask(() => setSupported(true));
    const stopOnLeave = () => { run.current += 1; synth.cancel(); };
    window.addEventListener("pagehide", stopOnLeave);
    return () => {
      synth.removeEventListener?.("voiceschanged", loadVoices);
      window.removeEventListener("pagehide", stopOnLeave);
      stopOnLeave();
    };
  }, []);

  const speakFrom = useCallback((start: number) => {
    const synth = window.speechSynthesis;
    run.current += 1;
    const token = run.current;
    synth.cancel();
    const speak = (position: number) => {
      if (token !== run.current) return;
      if (position >= chunks.length) {
        setStatus("idle"); setIndex(0); indexRef.current = 0;
        return;
      }
      setIndex(position); indexRef.current = position;
      const utterance = new SpeechSynthesisUtterance(chunks[position].text);
      utterance.rate = rateRef.current;
      utterance.lang = voice.current?.lang ?? "en-GB";
      if (voice.current) utterance.voice = voice.current;
      utterance.onend = () => speak(position + 1);
      utterance.onerror = (event) => {
        // "interrupted"/"canceled" come from our own pause/stop; anything else, skip ahead.
        if (event.error === "interrupted" || event.error === "canceled") return;
        speak(position + 1);
      };
      synth.speak(utterance);
    };
    setStatus("playing");
    // A short delay after cancel() avoids a Chrome bug where the next utterance is dropped.
    window.setTimeout(() => speak(start), 60);
  }, [chunks]);

  const pause = useCallback(() => {
    run.current += 1;
    window.speechSynthesis.cancel();
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    window.speechSynthesis.cancel();
    setStatus("idle"); setIndex(0); indexRef.current = 0;
  }, []);

  // First chunk of every paragraph: the stops for Back / Forward.
  const paragraphStarts = useMemo(
    () => chunks.flatMap((chunk, i) => (i === 0 || chunk.paragraph !== chunks[i - 1].paragraph ? [i] : [])),
    [chunks],
  );

  /** Jump to a chunk. Keeps playing if audio was playing; otherwise just moves the position. */
  const seek = useCallback((target: number, play: boolean) => {
    const position = Math.min(Math.max(0, target), chunks.length - 1);
    setIndex(position); indexRef.current = position;
    if (play) speakFrom(position);
  }, [chunks.length, speakFrom]);

  // Back: to the start of this paragraph, or to the previous one if already at its start.
  const back = () => {
    const current = indexRef.current;
    const thisStart = [...paragraphStarts].reverse().find((start) => start <= current) ?? 0;
    const target = current > thisStart ? thisStart : [...paragraphStarts].reverse().find((start) => start < thisStart) ?? 0;
    seek(target, status === "playing");
  };
  // Forward: to the start of the next paragraph.
  const forward = () => {
    const next = paragraphStarts.find((start) => start > indexRef.current);
    if (next !== undefined) seek(next, status === "playing");
  };
  const canForward = paragraphStarts.some((start) => start > index);

  // Dragging the position slider: hold the audio while scrubbing, resume on release.
  const scrubbing = useRef<{ wasPlaying: boolean } | null>(null);
  const scrubTo = (value: number) => {
    if (!scrubbing.current) {
      scrubbing.current = { wasPlaying: status === "playing" };
      if (status === "playing") { run.current += 1; window.speechSynthesis.cancel(); }
    }
    setIndex(value); indexRef.current = value;
  };
  const endScrub = () => {
    const state = scrubbing.current;
    scrubbing.current = null;
    if (state?.wasPlaying) speakFrom(indexRef.current);
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rateRef.current as (typeof RATES)[number]) + 1) % RATES.length];
    rateRef.current = next;
    setRate(next);
    try { localStorage.setItem(RATE_KEY, String(next)); } catch { /* ignore */ }
    if (status === "playing") speakFrom(indexRef.current);
  };

  // Show the floating control only while the inline player is off screen.
  // Measured directly in the scroll/resize handlers (one getBoundingClientRect;
  // React skips the update when the value is unchanged), so it never waits on
  // IntersectionObserver or animation-frame callbacks.
  const active = status !== "idle";
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      const rect = panel.current?.getBoundingClientRect();
      setPanelVisible(!rect || (rect.bottom > 0 && rect.top < window.innerHeight));
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  if (!supported || !chunks.length) return null;

  const progress = Math.round((index / chunks.length) * 100);
  const minutes = Math.max(1, Math.round(chunks.reduce((sum, chunk) => sum + chunk.text.split(/\s+/).length, 0) / (165 * rate)));
  const toggle = () => (status === "playing" ? pause() : speakFrom(status === "paused" ? indexRef.current : 0));
  const playLabel = status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Listen";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={status === "playing"}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-near-black"
      >
        {status === "playing" ? <Pause size={16} weight="fill" aria-hidden /> : <SpeakerHigh size={16} aria-hidden />}
        <span>{playLabel}</span>
        {!active ? <span className="font-normal">· {minutes} min</span> : null}
      </button>

      {active ? (
        <div ref={panel} className="listen-player" role="group" aria-label="Listen to this article">
          <button type="button" className="listen-btn" onClick={back} disabled={index === 0} aria-label="Back one paragraph" title="Back one paragraph">
            <SkipBack size={16} weight="fill" aria-hidden />
          </button>
          <button type="button" className="listen-btn listen-btn-main" onClick={toggle} aria-label={playLabel}>
            {status === "playing" ? <Pause size={18} weight="fill" aria-hidden /> : <Play size={18} weight="fill" aria-hidden />}
          </button>
          <button type="button" className="listen-btn" onClick={forward} disabled={!canForward} aria-label="Forward one paragraph" title="Forward one paragraph">
            <SkipForward size={16} weight="fill" aria-hidden />
          </button>
          <div className="listen-track">
            <div className="listen-meta">
              <span>{status === "playing" ? "Reading aloud" : "Paused"}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <input
              type="range"
              className="listen-range"
              min={0}
              max={Math.max(0, chunks.length - 1)}
              step={1}
              value={index}
              onChange={(event) => scrubTo(Number(event.target.value))}
              onPointerUp={endScrub}
              onKeyUp={endScrub}
              onBlur={() => { if (scrubbing.current) endScrub(); }}
              aria-label="Position in article"
              aria-valuetext={`${progress}% through the article`}
              style={{ "--listen-fill": `${chunks.length > 1 ? (index / (chunks.length - 1)) * 100 : 0}%` } as CSSProperties}
            />
          </div>
          <button type="button" className="listen-btn listen-rate" onClick={cycleRate} aria-label={`Reading speed ${rate}×, change speed`}>{rate}×</button>
          <button type="button" className="listen-btn" onClick={stop} aria-label="Stop listening"><Stop size={16} weight="fill" aria-hidden /></button>
        </div>
      ) : null}

      {active && !panelVisible ? (
        <div className="listen-float" role="group" aria-label="Listening controls">
          <button type="button" className="listen-btn" onClick={back} disabled={index === 0} aria-label="Back one paragraph"><SkipBack size={14} weight="fill" aria-hidden /></button>
          <button type="button" className="listen-btn listen-btn-main" onClick={toggle} aria-label={playLabel}>
            {status === "playing" ? <Pause size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
          </button>
          <button type="button" className="listen-btn" onClick={forward} disabled={!canForward} aria-label="Forward one paragraph"><SkipForward size={14} weight="fill" aria-hidden /></button>
          <span className="listen-float-label tabular-nums">{status === "playing" ? "Listening" : "Paused"} · {progress}%</span>
          <button type="button" className="listen-btn" onClick={stop} aria-label="Stop listening"><Stop size={14} weight="fill" aria-hidden /></button>
        </div>
      ) : null}
    </>
  );
}
