"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShareNetwork } from "@phosphor-icons/react";
import EmojiText from "@/components/play/EmojiText";
import SocialResult from "@/components/play/SocialResult";
import { thisOrThat } from "@/lib/games";
import { rememberSeenQuestions } from "@/lib/play";
import { composeResult, reactionFor, type QuizAnswer } from "@/lib/play-personality";

type Question = (typeof thisOrThat)[number] & { prompt?: string; day?: number };
type Side = "left" | "right";
const makeSession = (pool: Question[], start: number, count: number) => Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);

export default function ThisOrThat({ questions = thisOrThat, currentHref, initialAnswer, excludeId }: { questions?: typeof thisOrThat; currentHref?: string; initialAnswer?: QuizAnswer; excludeId?: string }) {
  const pool = useMemo(() => (excludeId ? questions.filter((q) => q.id !== excludeId) : questions) as Question[], [questions, excludeId]);
  const total = Math.min(7, pool.length);
  const [dailyStart] = useState(() => Math.max(0, Math.floor((Date.now() - new Date("2026-01-01T00:00:00Z").getTime()) / 86400000)) % Math.max(pool.length, 1));
  const [mix, setMix] = useState(0); const [session, setSession] = useState(() => makeSession(pool, dailyStart, total)); const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>(initialAnswer ? [initialAnswer] : []); const [selected, setSelected] = useState<Side | null>(null); const [reaction, setReaction] = useState(""); const [result, setResult] = useState<ReturnType<typeof composeResult> | null>(null); const [shared, setShared] = useState(false); const timer = useRef<number | null>(null);
  const question = session[index]; const round = answers.length + 1; const predictedSide: Side = answers.length % 2 === 0 ? "left" : "right";
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  function choose(side: Side) { if (!question || selected || result) return; const next = [...answers, { label: question[side].label, traits: question[side].traits }]; setSelected(side); setReaction(round === 4 ? (side === predictedSide ? "yeah... you're getting predictable" : "okay, you got us.") : reactionFor(question[side].traits)); timer.current = window.setTimeout(() => { setAnswers(next); if (next.length >= total) { rememberSeenQuestions(session.map((q) => q.id)); setResult(composeResult(next, null)); } else { setIndex((value) => value + 1); setSelected(null); setReaction(""); } }, 650); }
  function replay() { const nextMix = mix + 1; setMix(nextMix); setSession(makeSession(pool, (dailyStart + nextMix * total) % Math.max(pool.length, 1), total)); setIndex(0); setAnswers(initialAnswer ? [initialAnswer] : []); setSelected(null); setResult(null); setShared(false); }
  async function share() { if (!result) return; const text = `${result.shareText} — apparently BrisaStory knows too much about me.`; const challenge = `${window.location.origin}${window.location.pathname}?challenge=${encodeURIComponent(btoa(JSON.stringify({ q: session.map((item) => item.id), a: answers.map((answer) => answer.label) })))}`; try { if (navigator.share) await navigator.share({ title: "Your friend challenged you", text: `${text} Think you'd pick the same?`, url: challenge }); else { await navigator.clipboard?.writeText(`${text}\nPlay my seven: ${challenge}`); setShared(true); window.setTimeout(() => setShared(false), 1800); } } catch { setShared(false); } }
  // Arrow keys pick an answer from anywhere on the page, not only when the
  // game wrapper happens to have focus. Typing in a field is left alone.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (selected || result || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); choose("left"); }
      if (event.key === "ArrowRight") { event.preventDefault(); choose("right"); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  if (!question || !total) return <p className="border-y border-card-border py-10 text-muted">No questions available right now.</p>;
  if (result) return (
    <SocialResult
      game="This or That"
      headline={<>You got {result.title}</>}
      body={result.description}
      picks={result.choices}
      accent="#2563EB"
      primary={{ label: "Another mix", onClick: replay }}
      share={<button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-near-black">{shared ? "Link copied" : "Share result"} <ShareNetwork size={15} /></button>}
      currentHref={currentHref ?? "/play/stay-out"}
    />
  );
  return <div><header className="py-5 sm:flex sm:items-end sm:justify-between sm:gap-8"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-electric">BrisaStory / Play</p><h1 className="mt-2 font-heading text-4xl font-bold leading-none tracking-[-.04em] sm:text-6xl">This or That</h1></div><p className="mt-4 max-w-md text-sm leading-6 text-muted sm:mt-0">Friendship, crushes, money, travel and everyday chaos. Pick what feels right before you start explaining yourself.</p></header><div className="flex justify-between py-3 text-xs text-muted"><span>{String(round).padStart(2, "0")} / {String(total).padStart(2, "0")}</span><span>First instinct only</span></div><main className="py-7 sm:py-10"><p className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-[-.03em] sm:text-5xl"><EmojiText text={question.prompt || "Pick one. No overthinking."} /></p>{reaction && <p className="mt-3 text-sm font-bold text-electric" aria-live="polite">{reaction}</p>}<div className="mt-7 border-y border-card-border">{(["left", "right"] as Side[]).map((side, i) => <button key={side} type="button" onClick={() => choose(side)} disabled={Boolean(selected)} className={`group flex min-h-20 w-full items-center gap-4 border-b border-card-border py-4 text-left transition-colors duration-200 last:border-0 sm:min-h-24 sm:py-5 ${selected === side ? "text-electric" : "hover:text-electric"}`}><span className="w-7 shrink-0 font-mono text-xs text-muted">{i === 0 ? "A" : "B"}</span><span className="min-w-0 flex-1 font-heading text-2xl font-semibold leading-tight tracking-[-.025em] sm:text-3xl"><EmojiText text={question[side].label} /></span><ArrowRight size={20} className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" /></button>)}</div><div className="mt-4 flex justify-between text-[10px] uppercase tracking-[.12em] text-muted"><span className="hidden items-center gap-1 [@media(hover:hover)_and_(pointer:fine)]:inline-flex">Press <ArrowLeft aria-hidden="true" size={13} /> or <ArrowRight aria-hidden="true" size={13} /> to pick</span><span>{Math.max(total - answers.length, 0)} left</span></div></main></div>;
}
