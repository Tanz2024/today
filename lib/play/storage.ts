// Local, login-free progress for the Play games. Uses the existing
// `freshscene:play:*` namespace. Nothing personal is stored — only scores.

import { THEME_IDS, isThemeId, type ThemeId } from "./themes.ts";

export type GameType = "obby" | "rush" | "breaker";

export type GameStats = {
  gamesPlayed: number;
  bestScore: number;
  highestLevel: number;
  bestDistance: number;
  /** Most pickups in a single run. */
  bestCount: number;
};

export type GameResultInput = {
  score?: number;
  level?: number;
  distance?: number;
  count?: number;
};

export const GAME_STORAGE_PREFIX = "freshscene:play:";

const EMPTY_STATS: GameStats = { gamesPlayed: 0, bestScore: 0, highestLevel: 0, bestDistance: 0, bestCount: 0 };

export function gameStorageKey(game: GameType) {
  return `${GAME_STORAGE_PREFIX}${game}`;
}

function wholeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

// Corrupted or foreign values fall back to empty stats rather than throwing.
export function readGameStats(storage: Pick<Storage, "getItem"> | null, game: GameType): GameStats {
  try {
    const raw = storage?.getItem(gameStorageKey(game));
    if (!raw) return { ...EMPTY_STATS };
    const parsed = JSON.parse(raw) as Partial<Record<keyof GameStats, unknown>> | null;
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_STATS };
    return {
      gamesPlayed: wholeNumber(parsed.gamesPlayed),
      bestScore: wholeNumber(parsed.bestScore),
      highestLevel: wholeNumber(parsed.highestLevel),
      bestDistance: wholeNumber(parsed.bestDistance),
      bestCount: wholeNumber(parsed.bestCount),
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

// Records one finished run. Bests only ever go up, so a failed write or an
// interrupted session can never lower a personal best.
export function recordGameResult(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  game: GameType,
  result: GameResultInput,
): { stats: GameStats; isNewBest: boolean } {
  const previous = readGameStats(storage, game);
  const score = wholeNumber(result.score);
  const stats: GameStats = {
    gamesPlayed: previous.gamesPlayed + 1,
    bestScore: Math.max(previous.bestScore, score),
    highestLevel: Math.max(previous.highestLevel, wholeNumber(result.level)),
    bestDistance: Math.max(previous.bestDistance, wholeNumber(result.distance)),
    bestCount: Math.max(previous.bestCount, wholeNumber(result.count)),
  };
  try {
    storage?.setItem(gameStorageKey(game), JSON.stringify(stats));
  } catch {
    // Private mode or full storage: the run still counts on screen.
  }
  return { stats, isNewBest: score > 0 && score > previous.bestScore };
}

// Level progress can advance without a finished run (Obby level complete).
export function recordLevelReached(storage: Pick<Storage, "getItem" | "setItem"> | null, game: GameType, level: number): GameStats {
  const previous = readGameStats(storage, game);
  const stats = { ...previous, highestLevel: Math.max(previous.highestLevel, wholeNumber(level)) };
  try {
    storage?.setItem(gameStorageKey(game), JSON.stringify(stats));
  } catch {
    // Optional persistence.
  }
  return stats;
}

// Lifetime Brisa points and collected story themes, shared by every game.
export type PlayCollection = { points: number; themes: Record<ThemeId, number> };
export const COLLECTION_KEY = `${GAME_STORAGE_PREFIX}collection`;

function emptyCollection(): PlayCollection {
  return { points: 0, themes: Object.fromEntries(THEME_IDS.map((id) => [id, 0])) as Record<ThemeId, number> };
}

export function readCollection(storage: Pick<Storage, "getItem"> | null): PlayCollection {
  const collection = emptyCollection();
  try {
    const raw = storage?.getItem(COLLECTION_KEY);
    const parsed = raw ? JSON.parse(raw) as { points?: unknown; themes?: Record<string, unknown> } | null : null;
    if (!parsed || typeof parsed !== "object") return collection;
    collection.points = wholeNumber(parsed.points);
    for (const [id, count] of Object.entries(parsed.themes ?? {})) {
      if (isThemeId(id)) collection.themes[id] = wholeNumber(count);
    }
  } catch {
    // Unreadable collection: start fresh rather than fail.
  }
  return collection;
}

export function addToCollection(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  points: number,
  themes: Partial<Record<ThemeId, number>>,
): PlayCollection {
  const collection = readCollection(storage);
  collection.points += wholeNumber(points);
  for (const id of THEME_IDS) collection.themes[id] += wholeNumber(themes[id]);
  try {
    storage?.setItem(COLLECTION_KEY, JSON.stringify(collection));
  } catch {
    // Optional persistence.
  }
  return collection;
}

// Best collectible count per level (Obby: "7 of 9 stories"), for replay goals.
export function levelBestsKey(game: GameType) {
  return `${gameStorageKey(game)}:levels`;
}

export function readLevelBests(storage: Pick<Storage, "getItem"> | null, game: GameType): Record<number, number> {
  try {
    const raw = storage?.getItem(levelBestsKey(game));
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const bests: Record<number, number> = {};
    for (const [level, count] of Object.entries(parsed)) {
      const key = Number(level);
      if (Number.isInteger(key) && key > 0) bests[key] = wholeNumber(count);
    }
    return bests;
  } catch {
    return {};
  }
}

export function recordLevelBest(storage: Pick<Storage, "getItem" | "setItem"> | null, game: GameType, level: number, count: number) {
  const bests = readLevelBests(storage, game);
  const previous = bests[level] ?? 0;
  bests[level] = Math.max(previous, wholeNumber(count));
  try {
    storage?.setItem(levelBestsKey(game), JSON.stringify(bests));
  } catch {
    // Optional persistence.
  }
  return { best: bests[level], improved: bests[level] > previous };
}
