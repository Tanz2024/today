"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Shuffle } from "@phosphor-icons/react";
import { groupChat } from "@/lib/games";
import { shuffleQuestions } from "@/lib/play";

export default function GroupChat({ initialQuestion }: { initialQuestion?: string } = {}) {
  const [type, setType] = useState<keyof typeof groupChat>("Friends");
  const fallback = [{ type: "Friends" as keyof typeof groupChat, index: 0 }];
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") return fallback;
    try {
      const parsed = JSON.parse(localStorage.getItem("freshscene:play:group-history") ?? "[]") as { type: keyof typeof groupChat; index: number }[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  });
  const [position, setPosition] = useState(0);
  const current = history[position] ?? fallback[0];
  const list = initialQuestion && position === 0 ? [initialQuestion] : (groupChat[current.type] ?? groupChat[fallback[0].type] ?? ["What is one small thing that made your day better?"]);
  function show(index: number, nextType = type) { const next = [...history.slice(0, position + 1), { type: nextType, index }]; setHistory(next); setPosition(position + 1); localStorage.setItem("freshscene:play:group-history", JSON.stringify(next.slice(-30))); }
  function next(shuffle = false) { const seen = new Set(history.filter((item) => item.type === type).map((item) => item.index)); const available = list.map((_, index) => index).filter((index) => !seen.has(index)); const index = shuffle ? shuffleQuestions(available)[0] : available[0] ?? shuffleQuestions(list.map((_, i) => i))[0]; show(index); }
  return <div className="border-y border-card-border py-10"><div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-card-border pb-4">{Object.keys(groupChat).map((key)=><button key={key} onClick={()=>{setType(key as keyof typeof groupChat);show(0,key as keyof typeof groupChat)}} className={`text-sm ${key===current.type?"font-bold text-electric":"text-muted hover:text-electric"}`}>{key}</button>)}</div><p className="mt-10 text-[11px] font-bold uppercase tracking-[.14em] text-electric">{current.type}</p><h2 className="mt-4 max-w-2xl font-heading text-3xl font-bold leading-tight sm:text-5xl">“{list[current.index]}”</h2><div className="mt-10 flex gap-2"><button aria-label="Previous question" disabled={position===0} onClick={()=>setPosition(Math.max(0,position-1))} className="flex min-h-11 min-w-11 items-center justify-center border border-card-border hover:border-electric disabled:opacity-40"><ArrowLeft/></button><button onClick={()=>next()} className="flex min-h-11 items-center gap-2 bg-electric px-5 text-sm font-semibold text-white">Next <ArrowRight/></button><button aria-label="Shuffle question" onClick={()=>next(true)} className="flex min-h-11 min-w-11 items-center justify-center border border-card-border hover:border-electric"><Shuffle/></button></div></div>;
}
