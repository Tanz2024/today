"use client";

import Link from "next/link";
import { Check, Circle } from "@phosphor-icons/react";
import { useEffect, useState, type MouseEvent } from "react";

type Part = { id: string; label: string; href: string; external?: boolean };

export default function DailyDropProgress({ date, parts }: { date: string; parts: Part[] }) {
  const key = `brisastory:daily-drop:progress:${date}`;
  const [complete, setComplete] = useState<string[]>([]);
  useEffect(() => {
    try { const saved = JSON.parse(window.localStorage.getItem(key) ?? "[]"); if (Array.isArray(saved)) queueMicrotask(() => setComplete(saved.filter((id): id is string => typeof id === "string"))); } catch { /* optional */ }
  }, [key]);
  const mark = (id: string) => setComplete((current) => {
    const next = current.includes(id) ? current : [...current, id];
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* optional */ }
    return next;
  });
  const openPart = (event: MouseEvent<HTMLAnchorElement>, part: Part) => {
    if (!part.href.startsWith("#")) return;
    event.preventDefault();
    const target = document.getElementById(part.href.slice(1));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", part.href);
    window.setTimeout(() => (target as HTMLElement | null)?.focus({ preventScroll: true }), 350);
  };
  const finished = parts.length > 0 && parts.every((part) => complete.includes(part.id));
  return <div className="mt-4 border-y border-card-border py-3" aria-label="Daily Drop progress">
    <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-near-black">Your five-minute BrisaStory</p><Link href="/daily-drop" className="inline-flex min-h-11 items-center text-[11px] font-semibold text-muted underline-offset-2 hover:text-electric hover:underline">Archive</Link></div>
    <p className="mt-1 text-[12px] leading-5 text-muted">Three small stops. Finish the edition when you’re done.</p>
    <ol className="mt-3 grid gap-2 sm:grid-cols-3">{parts.map((part) => { const isDone = complete.includes(part.id); const content = <><span className={`shrink-0 ${isDone ? "text-electric" : "text-muted"}`}>{isDone ? <Check size={15} weight="bold" /> : <Circle size={15} />}</span><span>{part.label}</span></>; const className = `flex min-h-11 items-center gap-2 text-[12px] font-semibold ${isDone ? "text-muted hover:text-electric" : "text-near-black hover:text-electric"}`; return part.external ? <a key={part.id} href={part.href} target="_blank" rel="noopener noreferrer" onClick={() => mark(part.id)} className={className}>{content}</a> : <Link key={part.id} href={part.href} onClick={(event) => { mark(part.id); openPart(event, part); }} className={className}>{content}</Link>; })}</ol>
    <p className="mt-2 text-[11px] font-medium text-muted" aria-live="polite">{finished ? "Edition complete · see you tomorrow." : `${complete.length}/${parts.length} complete`}</p>
  </div>;
}
