"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MOOD_OPTIONS } from "@/lib/mood-options";
import type { MoodTag } from "@/types/article";

// Client-only piece of Mood Mode: just the chip selector. It updates the URL
// (shareable, no reload) and lets the server component re-render the actual
// results — nothing about the selection is stored beyond the URL itself.
export default function MoodModeChips({ selected }: { selected: MoodTag | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectMood(mood: MoodTag) {
    const params = new URLSearchParams(searchParams.toString());
    if (selected === mood) {
      params.delete("mood");
    } else {
      params.set("mood", mood);
    }
    const query = params.toString();
    router.replace(query ? `/?${query}#mood-mode` : "/", { scroll: false });
  }

  function clearMood() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("mood");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2"
        role="group"
        aria-label="What do you need right now?"
      >
        {MOOD_OPTIONS.map(({ value, label }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => selectMood(value)}
              aria-pressed={active}
              className={`flex min-h-11 w-full items-center justify-center rounded-[4px] border px-4 text-center text-[13px] font-medium transition duration-150 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric sm:min-h-10 sm:w-auto ${
                active
                  ? "border-electric bg-electric text-white"
                  : "border-card-border text-near-black [@media(hover:hover)]:hover:border-electric/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          type="button"
          onClick={clearMood}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-muted underline underline-offset-2 hover:text-electric"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
