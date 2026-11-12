// Pure, dependency-free read-tracking rules shared between the client
// tracker (ReadTimeTracker.tsx), the mobile toolbar (MobileReaderTools.tsx)
// and the server-side validation in read-stats.ts. Deliberately has zero
// imports so it's safe to pull into a client bundle — unlike read-stats.ts,
// which needs the server-only node-appwrite SDK.

// A page open is not a read. Both of these must hold before a read counts:
export const MIN_READ_SECONDS = 20;
export const MIN_BODY_SCROLL_RATIO = 0.3;

// Anonymous, local-only dedupe window: the same browser/device does not get
// a second counted read on the same article within this window.
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Fired on `window` with `{ slug, sampleCount }` once a read has actually
// been confirmed accepted by the server (never optimistically before that).
export const READ_RECORDED_EVENT = "brisastory:read-recorded";

// Don't show an *average* read time until enough real reads have
// contributed — avoids "1 person read this for 12 seconds" being presented
// as a stat. This threshold applies only to averageSeconds; sampleCount
// (the real read count) is always exposed as-is, including 0/1/2/3/4.
export const MIN_SAMPLE_SIZE_FOR_AVERAGE = 5;

export type DerivedReadStats = { sampleCount: number; averageSeconds: number | null };

// Pure derivation used by lib/read-stats.ts — kept here (rather than there)
// so it can be unit tested without pulling in the server-only node-appwrite
// SDK that read-stats.ts depends on.
export function deriveReadStats(sampleCount: number, totalSeconds: number): DerivedReadStats {
  const safeCount = Number.isFinite(sampleCount) && sampleCount > 0 ? sampleCount : 0;
  return {
    sampleCount: safeCount,
    averageSeconds: safeCount >= MIN_SAMPLE_SIZE_FOR_AVERAGE ? Math.round(totalSeconds / safeCount) : null,
  };
}

export function isMeaningfulRead({
  seconds,
  scrollRatio,
}: {
  seconds: number;
  scrollRatio: number;
}): boolean {
  return seconds >= MIN_READ_SECONDS && scrollRatio >= MIN_BODY_SCROLL_RATIO;
}

// `lastRecordedAtMs` is whatever this device previously stored (e.g. in
// localStorage) for this article, or null/undefined if it never recorded one.
export function isWithinDedupeWindow(
  lastRecordedAtMs: number | null | undefined,
  now: number = Date.now(),
): boolean {
  return typeof lastRecordedAtMs === "number" && Number.isFinite(lastRecordedAtMs) && now - lastRecordedAtMs < DEDUPE_WINDOW_MS;
}

// Compact display formatting for a real read count: 0, 12, 97, 842, 1.2K,
// 14.8K, 1.1M. The exact number should still be surfaced via aria-label/title.
export function formatReadCount(n: number): string {
  if (n < 1000) return String(Math.max(0, Math.round(n)));
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
