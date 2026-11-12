"use client";
import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import type { MusicEntry } from "@/lib/music";
import { useEffect, useState } from "react";
import { Heart } from "@phosphor-icons/react";

export type ResolvedMusic = MusicEntry & { artwork: string; spotifyTitle?: string };

export default function OnRepeat({ entries }: { entries: ResolvedMusic[] }) {
  const [active, setActive] = useState(0);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const monthKey = new Date().toISOString().slice(0, 7);
  const current = entries[active];
  useEffect(() => {
    Promise.all(entries.map(async (entry) => {
      const response = await fetch(`/api/reactions/music-${entry.id}-${monthKey}`);
      const data = response.ok ? await response.json() : null;
      return [entry.id, Object.values(data?.counts ?? {}).reduce((sum: number, value) => sum + Number(value), 0)] as const;
    })).then((items) => setReactions(Object.fromEntries(items))).catch(() => undefined);
    try { const stored = Object.fromEntries(entries.map((entry) => [entry.id, Boolean(localStorage.getItem(`freshscene:reaction:music-${entry.id}-${monthKey}`))])); queueMicrotask(() => setLiked(stored)); } catch { /* local storage unavailable */ }
  }, [entries, monthKey]);

  async function react(entry: ResolvedMusic) {
    if (liked[entry.id]) return;
    setLiked((value) => ({ ...value, [entry.id]: true }));
    try { localStorage.setItem(`freshscene:reaction:music-${entry.id}-${monthKey}`, "1"); } catch { /* local storage unavailable */ }
    setReactions((value) => ({ ...value, [entry.id]: (value[entry.id] ?? 0) + 1 }));
    const response = await fetch(`/api/reactions/music-${entry.id}-${monthKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "love" }) });
    const data = response.ok ? await response.json() : null;
    if (data?.persisted && data.counts) setReactions((value) => ({ ...value, [entry.id]: Object.values(data.counts).reduce((sum: number, count) => sum + Number(count), 0) }));
  }

  return <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start lg:gap-20"><div className="border-y border-card-border">{entries.map((entry,index)=><div key={entry.id} onMouseEnter={()=>setActive(index)} onFocus={()=>setActive(index)} className={`grid min-h-20 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-card-border py-5 last:border-0 sm:grid-cols-[28px_minmax(150px,1fr)_minmax(120px,1fr)_auto] sm:gap-4 ${active===index?"text-electric":"text-near-black"}`}><span className="shrink-0 font-script text-xs text-muted">{String(index+1).padStart(2,"0")}</span><Link href={entry.spotifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${entry.artist} — ${entry.track} on Spotify`} className="min-w-0 truncate hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric"><strong className="font-body text-base font-semibold sm:text-lg">{entry.artist}</strong></Link><span className="hidden min-w-0 truncate font-body text-base sm:block sm:text-lg">{entry.track}</span><button type="button" onClick={() => react(entry)} disabled={liked[entry.id]} aria-pressed={liked[entry.id] ?? false} aria-label={`React to ${entry.track}${reactions[entry.id] ? `, ${reactions[entry.id]} reactions` : ", no reactions yet"}`} className={`flex min-h-11 min-w-11 items-center justify-center gap-1 text-xs ${liked[entry.id] ? "text-electric" : "text-muted hover:text-electric"}`}><Heart size={19} weight={liked[entry.id] ? "fill" : "regular"} aria-hidden="true" />{Boolean(reactions[entry.id]) && reactions[entry.id]}</button></div>)}</div><div className="group order-first lg:order-last"><div className="relative aspect-square w-full overflow-hidden rounded-[4px] bg-off-white"><Image key={current.id} src={current.artwork} alt={`${current.artist} — ${current.track} artwork`} fill sizes="(max-width: 1024px) 100vw, 420px" className="object-cover transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"/></div></div></div>;
}
