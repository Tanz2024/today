// Daily return loop for the Play games: one target per game per day (the same
// for every player, so it can be compared and shared) and a play streak.
// Stored locally under the existing `freshscene:play:*` namespace.

import { GAME_STORAGE_PREFIX, type GameType } from "./storage.ts";

export type DailyTarget = { day: string; value: number; label: string };
export type Streak = { current: number; best: number; lastDay: string | null };

const STREAK_KEY = `${GAME_STORAGE_PREFIX}streak`;
const dailyKey = (game: GameType) => `${GAME_STORAGE_PREFIX}daily:${game}`;

// Target ranges are a few steps above a first-time run, so most players can
// hit them with a couple of tries.
const TARGETS: Record<GameType, { min: number; max: number; step: number; label: (value: number) => string }> = {
  rush: { min: 200, max: 600, step: 50, label: (value) => `Run ${value}m` },
  obby: { min: 150, max: 450, step: 50, label: (value) => `Score ${value}` },
  breaker: { min: 200, max: 700, step: 50, label: (value) => `Score ${value}` },
};

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function dailyTarget(game: GameType, day: string = dayKey()): DailyTarget {
  const { min, max, step, label } = TARGETS[game];
  const steps = Math.floor((max - min) / step) + 1;
  const value = min + (hash(`${game}:${day}`) % steps) * step;
  return { day, value, label: label(value) };
}

function previousDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(new Date(year, month - 1, date - 1));
}

export function readStreak(storage: Pick<Storage, "getItem"> | null, today: string = dayKey()): Streak {
  try {
    const raw = storage?.getItem(STREAK_KEY);
    const value = raw ? JSON.parse(raw) as Partial<Streak> : null;
    if (!value || typeof value.lastDay !== "string") return { current: 0, best: 0, lastDay: null };
    const best = Math.max(0, Math.floor(Number(value.best) || 0));
    // A streak is still alive if the last play was today or yesterday.
    const alive = value.lastDay === today || value.lastDay === previousDay(today);
    return { current: alive ? Math.max(0, Math.floor(Number(value.current) || 0)) : 0, best, lastDay: value.lastDay };
  } catch {
    return { current: 0, best: 0, lastDay: null };
  }
}

/** Counts today as a play day. Playing again on the same day changes nothing. */
export function recordPlayDay(storage: Pick<Storage, "getItem" | "setItem"> | null, today: string = dayKey()): Streak {
  const streak = readStreak(storage, today);
  if (streak.lastDay === today) return streak;
  const current = streak.current + 1;
  const next = { current, best: Math.max(streak.best, current), lastDay: today };
  try { storage?.setItem(STREAK_KEY, JSON.stringify(next)); } catch { /* optional */ }
  return next;
}

export function dailyTargetHit(storage: Pick<Storage, "getItem"> | null, game: GameType, today: string = dayKey()) {
  try { return storage?.getItem(dailyKey(game)) === today; } catch { return false; }
}

/** Records a run against today's target. `hit` is true once the target has been hit today by any run. */
export function recordDailyResult(storage: Pick<Storage, "getItem" | "setItem"> | null, game: GameType, result: number, today: string = dayKey()) {
  const target = dailyTarget(game, today);
  const hitThisRun = result >= target.value;
  if (hitThisRun) { try { storage?.setItem(dailyKey(game), today); } catch { /* optional */ } }
  return { target, hit: hitThisRun || dailyTargetHit(storage, game, today), remaining: Math.max(0, target.value - Math.floor(result)) };
}

/** A small per-day number (the same for everyone) that games use to vary their layouts. */
export function dailyShift(game: GameType, day: string = dayKey()) {
  return hash(`layout:${game}:${day}`) % 60;
}
