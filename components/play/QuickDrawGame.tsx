"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, ShareNetwork, Shuffle } from "@phosphor-icons/react";

const PROMPTS = [
  { label: "planet", text: "a tiny planet" },
  { label: "cookie", text: "your dream snack" },
  { label: "robot", text: "a weird little robot" },
  { label: "rain", text: "a rainy window" },
  { label: "cat", text: "a creature with three eyes" },
  { label: "castle", text: "a place you would teleport to" },
];
type Guess = { label: string; score: number };

export default function QuickDrawGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [seconds, setSeconds] = useState(20);
  const [round, setRound] = useState(1);
  const [recognized, setRecognized] = useState<boolean[]>([]);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share with a friend");
  const model = useRef<Promise<(input: unknown) => Promise<Guess[]>> | null>(null);
  const recognitionTimer = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value > 0 ? value - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; const position = point(event); if (!canvas || !position) return;
    drawing.current = true; canvas.setPointerCapture(event.pointerId); const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(position.x, position.y);
  }
  async function recognize() {
    const canvas = canvasRef.current;
    if (!canvas || !drawing.current) return;
    if (!model.current) {
      setLoading(true);
      model.current = import("@huggingface/transformers").then(async ({ pipeline }) => {
        const classifier = await pipeline("image-classification", "Xenova/quickdraw-mobilevit-small", { dtype: "q8" });
        return async (input: unknown) => {
          const output = await classifier(input as never, { top_k: 3 });
          return (Array.isArray(output) ? output : []).map((item: { label?: string; score?: number }) => ({ label: String(item.label ?? "").toLowerCase(), score: Number(item.score ?? 0) }));
        };
      }).finally(() => setLoading(false));
    }
    try {
      const { RawImage } = await import("@huggingface/transformers");
      const predictions = await (await model.current)(await RawImage.fromCanvas(canvas));
      const best = predictions[0];
      setGuess(best ?? null);
      if (best && best.score >= 0.55 && best.label.includes(prompt.label)) {
        setRecognized((items) => [...items, true]);
        setSeconds(0);
      }
    } catch {
      setGuess(null);
    }
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return; const position = point(event); const ctx = canvasRef.current?.getContext("2d"); if (!position || !ctx) return;
    ctx.lineTo(position.x, position.y); ctx.stroke();
    if (recognitionTimer.current) window.clearTimeout(recognitionTimer.current);
    recognitionTimer.current = window.setTimeout(() => void recognize(), 500);
  }
  function stop() { drawing.current = false; }
  function clear() { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  function shuffle() { setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]); setSeconds(20); setGuess(null); clear(); }
  function nextRound() { if (round >= 5) return; setRound((value) => value + 1); shuffle(); }
  function replay() { setRound(1); setRecognized([]); setGuess(null); setSeconds(20); setPrompt(PROMPTS[0]); clear(); }
  function download() { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = `brisa-quick-draw-${prompt.label}.png`; link.href = canvas.toDataURL("image/png"); link.click(); }
  async function share() {
    const text = `I drew ${prompt.text} on Brisa Quick Draw.`;
    try {
      const canNativeShare = "share" in navigator && typeof navigator.share === "function";
      if (canNativeShare) await navigator.share({ title: "Brisa Quick Draw", text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setShareLabel(canNativeShare ? "Shared" : "Link copied");
    } catch {
      setShareLabel("Share cancelled");
    }
    window.setTimeout(() => setShareLabel("Share with a friend"), 2200);
  }

  useEffect(() => { const ctx = canvasRef.current?.getContext("2d"); if (ctx) { ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111111"; } }, []);

  const complete = round === 5 && seconds === 0;
  return <main className="mx-auto max-w-[980px] px-5 py-10 sm:px-8 sm:py-16">
    <Link href="/play" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-electric"><ArrowLeft size={15} /> Back to Play</Link>
    <header className="mt-10 flex flex-col gap-4 border-b border-near-black pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">Brisa Quick Draw · Round {round} / 5</p><h1 className="mt-3 font-heading text-4xl font-black tracking-[-.05em] sm:text-6xl">Draw before time runs out.</h1><p className="mt-3 text-sm text-muted">The browser guesses from your actual drawing.</p></div><div className="text-right"><p className="font-mono text-4xl font-bold tabular-nums">00:{String(seconds).padStart(2, "0")}</p><p className="text-[10px] uppercase tracking-[.14em] text-muted">seconds left</p></div></header>
    {complete ? <section className="mt-8 border-y border-near-black py-10"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">Session complete</p><h2 className="mt-3 font-heading text-4xl font-black tracking-[-.05em]">{recognized.filter(Boolean).length} / 5 recognized.</h2><p className="mt-3 text-sm text-muted">Only genuine model matches count. Your drawings stay on this device.</p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={replay} className="min-h-11 bg-near-black px-5 text-sm font-bold text-white hover:bg-electric">Play again</button><button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 border border-near-black px-4 text-sm font-semibold"><Download size={15} /> Download PNG</button><button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 border border-near-black px-4 text-sm font-semibold"><ShareNetwork size={15} /> {shareLabel}</button></div></section> : <section className="mt-7 grid gap-5 lg:grid-cols-[.4fr_1fr] lg:gap-8"><div className="border border-card-border bg-[#eef3ff] p-5 sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-electric">Your prompt</p><p className="mt-4 font-heading text-3xl font-semibold leading-tight tracking-[-.04em]">Draw {prompt.text}.</p><p className="mt-5 min-h-6 text-sm text-muted" aria-live="polite">{loading ? "Loading recognition…" : guess ? `I see ${guess.label} (${Math.round(guess.score * 100)}%)` : "Start drawing and I’ll make a guess."}</p><button type="button" onClick={shuffle} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-electric">New prompt <Shuffle size={15} /></button></div><div><canvas ref={canvasRef} width={900} height={620} aria-label={`Drawing canvas for ${prompt.text}`} className="block aspect-[4/3] w-full touch-none border border-near-black bg-white" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} /><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={clear} className="min-h-11 border border-near-black px-4 text-sm font-semibold hover:bg-near-black hover:text-white">Clear</button><button type="button" onClick={nextRound} disabled={seconds > 0} className="min-h-11 border border-near-black px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next round</button><button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 border border-near-black px-4 text-sm font-semibold hover:bg-near-black hover:text-white"><Download size={15} /> Download PNG</button><button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 bg-near-black px-4 text-sm font-semibold text-white hover:bg-electric"><ShareNetwork size={15} /> {shareLabel}</button></div></div></section>}
  </main>;
}
