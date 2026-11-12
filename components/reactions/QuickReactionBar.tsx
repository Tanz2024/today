"use client";

import { useEffect, useState } from "react";
import { Ghost, Heart, Lightning, Skull, Sparkle, ThumbsUp, Warning, XCircle } from "@phosphor-icons/react";
import type { QuickReactionCounts, QuickReactionType } from "@/lib/quick-reactions";

const DEFAULT_OPTIONS: { type: QuickReactionType; label: string; icon: typeof Heart }[] = [
  { type: "relatable", label: "Relatable", icon: Heart },
  { type: "helpful", label: "Helpful", icon: ThumbsUp },
  { type: "surprising", label: "Surprising", icon: Sparkle },
  { type: "notForMe", label: "Not for me", icon: XCircle },
];

const ICONS = { heart: Heart, thumbsUp: ThumbsUp, sparkle: Sparkle, xCircle: XCircle, ghost: Ghost, skull: Skull, warning: Warning, lightning: Lightning } as const;

const ICON_LABELS: Partial<Record<keyof typeof ICONS, string>> = {
  ghost: "Spooky",
  warning: "Unsettling",
  skull: "Intense",
  lightning: "Unexpected",
};

function storageKey(targetId: string) {
  return `freshscene:quick-reaction:${targetId}`;
}

export default function QuickReactionBar({
  targetId,
  initialCounts,
  reactionIcons,
}: {
  targetId: string;
  initialCounts: QuickReactionCounts;
  reactionIcons?: Partial<Record<QuickReactionType, keyof typeof ICONS>>;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [selected, setSelected] = useState<QuickReactionType | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(targetId));
      if (stored) queueMicrotask(() => setSelected(stored as QuickReactionType));
    } catch {
      // local storage is unavailable; the server-rendered state is safe.
    }
  }, [targetId]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const options = DEFAULT_OPTIONS.map((option) => ({ ...option, icon: reactionIcons?.[option.type] ? ICONS[reactionIcons[option.type]!] : option.icon }));

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/quick-reactions?targetId=${encodeURIComponent(targetId)}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data?.counts && !pending) setCounts(data.counts);
      } catch {
        // The existing rendered counts remain usable when a refresh fails.
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [targetId, pending]);

  async function pick(type: QuickReactionType) {
    if (pending || selected === type) return;
    setPending(true);
    setError(false);

    const previous = selected;
    const previousCounts = counts;

    // Optimistic update, mirroring the "replace, don't stack" server semantics.
    setCounts((current) => {
      const next = { ...current };
      if (previous) next[previous] = Math.max(0, next[previous] - 1);
      next[type] = next[type] + 1;
      return next;
    });
    setSelected(type);

    try {
      const res = await fetch("/api/quick-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, type }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data?.persisted && data.counts) {
        setCounts(data.counts);
        try {
          localStorage.setItem(storageKey(targetId), type);
        } catch {
          // ignore
        }
      } else if (!data?.persisted) {
        // Appwrite unavailable — roll back to avoid showing a fake count.
        setCounts(previousCounts);
        setSelected(previous);
        setError(true);
      }
    } catch {
      setCounts(previousCounts);
      setSelected(previous);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 sm:flex sm:w-fit sm:gap-5 lg:gap-7" role="group" aria-label="React to this">
        {options.map(({ type, label, icon: Icon }) => {
          const active = selected === type;
          const iconName = reactionIcons?.[type];
          const displayLabel = iconName ? ICON_LABELS[iconName] ?? label : label;
          return (
            <button
              key={type}
              type="button"
              onClick={() => pick(type)}
              aria-pressed={active}
              disabled={pending}
              aria-label={`${displayLabel}${counts[type] ? `, ${counts[type]} reactions` : ", no reactions yet"}`}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg border-0 py-1.5 text-sm font-semibold transition duration-150 [@media(hover:hover)]:hover:bg-black/[0.04] focus-visible:bg-black/[0.06] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-wait disabled:opacity-70 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-base ${
                active
                  ? "text-electric"
                  : "text-near-black [@media(hover:hover)]:hover:text-electric"
              }`}
            >
              <Icon aria-hidden size={20} weight={active ? "fill" : "regular"} className="shrink-0 transition-transform duration-150" />
              <span className="sm:not-sr-only sm:whitespace-nowrap!">{displayLabel}</span>
              <span className={`text-[10px] font-normal leading-none text-muted sm:text-xs ${counts[type] > 0 ? "" : "invisible sm:hidden"}`}>
                {counts[type] > 0 ? counts[type] : null}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="status" className="mt-2 text-xs text-muted">
          Couldn&apos;t save that reaction — please try again.
        </p>
      )}
    </div>
  );
}
