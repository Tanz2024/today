"use client";

import { useState } from "react";
import { Fire, Heart, Smiley, SmileySad } from "@phosphor-icons/react";
import type { ReactionCounts, ReactionType } from "@/types/article";

const OPTIONS = [
  { type: "love", icon: Heart, emoji: "❤️", label: "Love it", color: "text-coral" },
  { type: "laugh", icon: Smiley, emoji: "😂", label: "LOL", color: "text-orange" },
  { type: "cry", icon: SmileySad, emoji: "😮", label: "Too real", color: "text-electric" },
  { type: "fire", icon: Fire, emoji: "🔥", label: "Facts", color: "text-orange" },
] satisfies { type: ReactionType; icon: typeof Heart; emoji: string; label: string; color: string }[];

function storageKey(slug: string) {
  return `freshscene:reaction:${slug}`;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n / 1000)}K`;
}

export default function ReactionBar({
  slug,
  initialCounts,
  emojiOnly = false,
}: {
  slug: string;
  initialCounts: ReactionCounts;
  emojiOnly?: boolean;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<ReactionType | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey(slug));
      return stored ? (stored as ReactionType) : null;
    } catch {
      return null;
    }
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick(type: ReactionType) {
    if (pending) return;
    setPending(true);

    const previous = selected;
    const previousCounts = counts;
    const isRemoving = previous === type;

    setCounts((c) => {
      const next = { ...c };
      if (previous) next[previous] = Math.max(0, next[previous] - 1);
      if (!isRemoving) next[type] = next[type] + 1;
      return next;
    });
    setSelected(isRemoving ? null : type);
    setError(false);

    try {
      localStorage.setItem(storageKey(slug), isRemoving ? "" : type);
      if (isRemoving) localStorage.removeItem(storageKey(slug));
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/reactions/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, previous }),
      });
      if (!res.ok) throw new Error("Reaction was not saved");
      const data = await res.json();
      if (!data?.persisted || !data.counts) throw new Error("Reaction was not saved");
      setCounts(data.counts);
    } catch {
      setCounts(previousCounts);
      setSelected(previous);
      setError(true);
      try {
        if (previous) localStorage.setItem(storageKey(slug), previous);
        else localStorage.removeItem(storageKey(slug));
      } catch {
        // ignore restricted storage
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2" aria-busy={pending}>
      {OPTIONS.map(({ type, icon: Icon, emoji, label, color }) => {
        const active = selected === type;
        return (
          <button
            key={type}
            onClick={() => handleClick(type)}
            aria-pressed={active}
            className={`flex min-h-11 items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-sm font-semibold transition duration-150 ${
              active
                ? "bg-electric/10 text-electric"
                : "text-near-black hover:bg-black/[.04] dark:text-white dark:hover:bg-white/[.08]"
            }`}
          >
            {emojiOnly ? <span aria-hidden className="text-xl leading-none">{emoji}</span> : <Icon aria-hidden size={20} weight={active ? "fill" : "regular"} className={color} />}
            <span className={emojiOnly ? "sr-only" : undefined}>{label}</span>
            {counts[type] > 0 && <span className="text-xs text-muted">{formatCount(counts[type])}</span>}
          </button>
        );
      })}
      {error && <span role="status" className="sr-only">Your reaction could not be saved. Please try again.</span>}
    </div>
  );
}
