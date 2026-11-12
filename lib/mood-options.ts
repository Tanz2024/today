// Client-safe: no server-only imports (unlike lib/mood.ts, which pulls in
// lib/articles.ts and its Node "fs" usage). Client components must import
// from here, not from lib/mood.ts.
import type { MoodTag } from "@/types/article";

export const MOOD_OPTIONS: { value: MoodTag; label: string }[] = [
  { value: "bored", label: "I'm bored" },
  { value: "overthinking", label: "Overthinking" },
  { value: "broke", label: "Broke" },
  { value: "going-out", label: "Going out" },
  { value: "need-advice", label: "Need advice" },
  { value: "need-music", label: "Need music" },
];

export function isMoodTag(value: unknown): value is MoodTag {
  return typeof value === "string" && MOOD_OPTIONS.some((option) => option.value === value);
}
