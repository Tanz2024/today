// Picks the articles shown after a game. Reuses the homepage visitor
// scoring; the game that was played is deliberately NOT a signal — it says
// nothing about who the reader is.
import { hasPersonalizationSignal, normalizeArticleId, scoreArticleForVisitor, type ScorableArticle } from "../homepage-personalization.ts";
import { articleMatchesTheme, topTheme, type ThemeId } from "./themes.ts";

export type PlayArticle = ScorableArticle & {
  readingTime: string;
  /** Shorter headline for tight spaces; falls back to `title`. */
  displayTitle?: string;
  /** 0-based position in the editorial/trending order, if the article is in it. */
  trendingIndex?: number;
};

export type PlaySignals = {
  recentlyRead?: readonly string[];
  interests?: readonly string[];
  /** Story themes collected during the run just played. */
  collected?: Partial<Record<ThemeId, number>>;
  /** Stories already offered on recent result screens, newest first. */
  recentlyShown?: readonly string[];
};

function editorialScore(article: PlayArticle) {
  return typeof article.trendingIndex === "number" ? Math.max(0, 24 - article.trendingIndex * 6) : 0;
}

function newestFirst(a: PlayArticle, b: PlayArticle) {
  return new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime();
}

// Ranks the candidate pool: unread first, then (with a signal) reading and
// interest affinity plus freshness, otherwise trending then freshest.
export function rankPlayArticles(candidates: readonly PlayArticle[], signals: PlaySignals = {}): PlayArticle[] {
  if (candidates.length === 0) return [];
  const recentlyRead = signals.recentlyRead ?? [];
  const interests = signals.interests ?? [];
  const recent = new Set(recentlyRead.map(normalizeArticleId));

  // 1. Unread first; only fall back to read stories if everything is read.
  const unread = candidates.filter((article) => !recent.has(normalizeArticleId(article.slug)));
  const pool = unread.length > 0 ? unread : [...candidates];

  // Cold start: strong trending stories, otherwise the freshest.
  if (!hasPersonalizationSignal(interests, recentlyRead)) {
    return [...pool].sort((a, b) => editorialScore(b) - editorialScore(a) || newestFirst(a, b));
  }

  // 2–5. Reading affinity, chosen interests, topic affinity and freshness.
  const recentTopics = [...new Set(
    candidates
      .filter((article) => recent.has(normalizeArticleId(article.slug)))
      .flatMap((article) => [article.category, ...article.tags]),
  )].slice(0, 8);

  const score = (article: PlayArticle) =>
    scoreArticleForVisitor(article, { interests, recentlyRead, recentTopics, editorialScore: editorialScore(article) });
  return [...pool].sort((a, b) => score(b) - score(a) || newestFirst(a, b));
}

export function pickPlayArticle(candidates: readonly PlayArticle[], signals: PlaySignals = {}): PlayArticle | null {
  return pickPlayArticles(candidates, signals, 1)[0] ?? null;
}

// The post-game shelf: when the run collected story themes, the best story on
// the most-collected theme leads; the rest follow the normal ranking.
export function pickPlayArticles<T extends PlayArticle>(candidates: readonly T[], signals: PlaySignals = {}, count = 3): T[] {
  const ranked = rankPlayArticles(candidates, signals) as T[];
  const theme = topTheme(signals.collected ?? {});
  const lead = theme ? ranked.find((article) => articleMatchesTheme(article, theme)) : undefined;
  const leadFirst = lead ? [lead, ...ranked.filter((article) => article !== lead)] : ranked;
  // Rotate the shelf: stories offered after recent runs drop to the back, so
  // replaying does not show the same three again while fresh ones remain.
  const shown = new Set((signals.recentlyShown ?? []).map(normalizeArticleId));
  const ordered = [
    ...leadFirst.filter((article) => !shown.has(normalizeArticleId(article.slug))),
    ...leadFirst.filter((article) => shown.has(normalizeArticleId(article.slug))),
  ];
  // Spread the shelf across desks: one story per category first, then fill.
  const picked: T[] = [];
  const categories = new Set<string>();
  for (const article of ordered) {
    if (picked.length >= count) break;
    if (!categories.has(article.category)) { picked.push(article); categories.add(article.category); }
  }
  for (const article of ordered) {
    if (picked.length >= count) break;
    if (!picked.includes(article)) picked.push(article);
  }
  return picked;
}

const SHOWN_KEY = "freshscene:play:shown";
const SHOWN_LIMIT = 15;

export function readRecentlyShown(storage: Pick<Storage, "getItem"> | null): string[] {
  try {
    const value = JSON.parse(storage?.getItem(SHOWN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === "string").slice(0, SHOWN_LIMIT) : [];
  } catch {
    return [];
  }
}

export function recordShown(storage: Pick<Storage, "getItem" | "setItem"> | null, slugs: readonly string[]) {
  const next = [...slugs, ...readRecentlyShown(storage).filter((slug) => !slugs.includes(slug))].slice(0, SHOWN_LIMIT);
  try { storage?.setItem(SHOWN_KEY, JSON.stringify(next)); } catch { /* optional */ }
}
