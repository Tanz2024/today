"use client";

import { useEffect, useMemo, useState } from "react";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";
import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import type { MusicEntry } from "@/lib/music";
import { Heart, Play } from "@phosphor-icons/react";

function formatWeek(week: string) {
  return clampToLaunch(week).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: DISPLAY_TIME_ZONE });
}

function likedKey(slug: string) {
  return `freshscene:reaction:${slug}`;
}

type ResolvedMusic = MusicEntry & { artwork: string; spotifyTitle?: string };

export default function OnRepeat({ tracks }: { tracks: ResolvedMusic[] }) {
  const [active, setActive] = useState(0);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const monthKey = new Date().toISOString().slice(0, 7);
  const current = tracks[active];

  useEffect(() => {
    Promise.all(tracks.map(async (track) => {
      const response = await fetch(`/api/reactions/music-${track.id}-${monthKey}`);
      const data = response.ok ? await response.json() : null;
      return [track.id, Object.values(data?.counts ?? {}).reduce((sum: number, value) => sum + Number(value), 0)] as const;
    })).then((entries) => setReactions(Object.fromEntries(entries))).catch(() => undefined);

    try {
      const entries = tracks.map((track) => [track.id, Boolean(localStorage.getItem(likedKey(`music-${track.id}-${monthKey}`)))] as const);
      queueMicrotask(() => setLiked(Object.fromEntries(entries)));
    } catch {
      // ignore
    }
  }, [tracks, monthKey]);

  const topTracks = useMemo(() => [...tracks].sort((a, b) => (reactions[b.id] ?? 0) - (reactions[a.id] ?? 0)), [tracks, reactions]);

  async function react(track: MusicEntry) {
    if (liked[track.id]) return;

    setLiked((current) => ({ ...current, [track.id]: true }));
    try {
      localStorage.setItem(likedKey(`music-${track.id}-${monthKey}`), "1");
    } catch {
      // ignore
    }

    setReactions((current) => ({ ...current, [track.id]: (current[track.id] ?? 0) + 1 }));
    const response = await fetch(`/api/reactions/music-${track.id}-${monthKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "love" }) });
    const data = response.ok ? await response.json() : null;
    if (data?.persisted && data.counts) setReactions((current) => ({ ...current, [track.id]: Object.values(data.counts).reduce((sum: number, value) => sum + Number(value), 0) }));
  }

  return (
    <section>
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10">
        <div className="order-2 lg:order-1">
          <h2 className="font-heading text-[24px] font-semibold sm:text-[28px]">On Repeat</h2>
          <p className="mt-1 text-sm text-muted">Week of {formatWeek(tracks[0]?.week ?? new Date().toISOString())}</p>

          <div className="relative mx-auto mb-5 mt-5 aspect-square w-44 overflow-hidden lg:hidden">
            {tracks.map((track, index) => (
              <Image
                key={track.id}
                src={track.artwork}
                alt=""
                fill
                sizes="128px"
                className="object-cover transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ opacity: index === active ? 1 : 0 }}
              />
            ))}
          </div>

          <div className="mt-2 border-t border-card-border lg:mt-4">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="group grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-card-border py-2 text-left sm:grid-cols-[48px_minmax(150px,1fr)_minmax(120px,1fr)_auto] sm:gap-4 sm:py-2.5"
              >
                <div className="relative aspect-square overflow-hidden bg-[#eef0f2]">{track.artwork && <Image src={track.artwork} alt="" fill sizes="48px" className="object-cover" />}</div>
                <Link
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Listen to ${track.artist} — ${track.track} on Spotify`}
                  className={`min-w-0 flex-1 truncate font-medium transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric ${
                    index === active ? "text-electric" : "text-near-black"
                  }`}
                >
                  {track.artist}
                </Link>
                <Link
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Listen to ${track.track} by ${track.artist} on Spotify`}
                  className="hidden min-w-0 truncate text-muted hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric sm:block"
                >
                  {track.track}
                </Link>
                <Play aria-hidden="true" size={14} weight="fill" className="hidden text-electric sm:block" />
                <button type="button" onClick={() => react(track)} disabled={liked[track.id]} aria-pressed={liked[track.id] ?? false} aria-label={`React to ${track.track}${reactions[track.id] ? `, ${reactions[track.id]} reactions` : ", no reactions yet"}`} className={`flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 text-xs transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric ${liked[track.id] ? "text-electric" : "text-muted hover:text-electric"}`}><Heart size={19} weight={liked[track.id] ? "fill" : "regular"} aria-hidden="true" />{Boolean(reactions[track.id]) && reactions[track.id]}</button>
              </div>
            ))}
          </div>

          {current && (
            <div className="mt-4 sm:mt-6">
              <p className="line-clamp-2 max-w-sm text-sm text-muted sm:line-clamp-none">{current.editorNote}</p>
            </div>
          )}

          {Object.values(reactions).some((count) => count > 0) && <div className="mt-6 hidden border-t border-card-border pt-3 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Top reacted this month</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">{topTracks.slice(0, 3).filter((track) => (reactions[track.id] ?? 0) > 0).map((track, index) => <span key={track.id}>{index + 1}. {track.artist} · {reactions[track.id]}</span>)}</div>
          </div>}

        </div>

        <div className="relative order-1 mb-8 hidden aspect-square w-full overflow-hidden lg:order-2 lg:block lg:mb-0">
          {tracks.map((track, index) => (
            <Image
              key={track.id}
              src={track.artwork}
              alt=""
              fill
              sizes="300px"
              className="object-cover transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ opacity: index === active ? 1 : 0 }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
