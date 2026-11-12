export type FocusMode = "focus" | "short" | "long";
export const FOCUS_DURATIONS: Record<FocusMode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
export function secondsLeft(targetEnd: number, now: number) { return Math.max(0, Math.ceil((targetEnd - now) / 1000)); }
