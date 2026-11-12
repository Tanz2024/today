import drops from "@/content/daily-drops.json";
import { getArticleBySlug } from "@/lib/articles";
import { selectDailyDrop, todayInSiteTimezone } from "@/lib/daily-drop-select";
import type { Category } from "@/types/article";
import type { DailyDrop } from "@/types/daily-drop";

export { SITE_TIMEZONE, todayInSiteTimezone } from "@/lib/daily-drop-select";

export type DailyDropResult = { drop: DailyDrop; isLatest: boolean } | null;

// Returns today's Daily Drop if one exists for the current site-timezone
// date, otherwise the most recent past entry labeled as a fallback ("Latest
// Drop"). Returns null only if there is no content at all.
export function getCurrentDailyDrop(now: Date = new Date()): DailyDropResult {
  const result = selectDailyDrop(drops as DailyDrop[], todayInSiteTimezone(now));
  return result ? { drop: result.entry, isLatest: result.isLatest } : null;
}

export function getDailyDropById(id: string): DailyDrop | undefined {
  return (drops as DailyDrop[]).find((drop) => drop.id === id);
}

// Resolves the real article a drop links to, for image/category/reading-time
// display — keeps that data sourced from the article itself instead of
// duplicating (and risking staleness) in daily-drops.json.
export function getDailyDropStoryArticle(drop: DailyDrop) {
  const [, category, slug] = drop.storyHref.split("/");
  if (!category || !slug) return undefined;
  return getArticleBySlug(category as Category, slug);
}
