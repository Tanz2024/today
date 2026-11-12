// Pure, framework/import-alias-free logic so it can be unit tested directly
// with Node's built-in test runner (which doesn't resolve "@/..." aliases).

export const SITE_TIMEZONE = "Asia/Kuala_Lumpur";

export function todayInSiteTimezone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type DateEntry = { date: string };

export function selectDailyDrop<T extends DateEntry>(
  entries: T[],
  today: string
): { entry: T; isLatest: boolean } | null {
  if (entries.length === 0) return null;

  const exact = entries.find((entry) => entry.date === today);
  if (exact) return { entry: exact, isLatest: false };

  const sortedDesc = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const past = sortedDesc.filter((entry) => entry.date <= today);
  if (past.length > 0) return { entry: past[0], isLatest: true };

  // No past entry (e.g. all dates are in the future) — fall back to the
  // earliest scheduled entry rather than showing nothing.
  return { entry: sortedDesc[sortedDesc.length - 1], isLatest: true };
}
