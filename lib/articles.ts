import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Article, ArticleFrontmatter, Category } from "@/types/article";
import { CATEGORIES } from "@/lib/categories";
import { resolveImage } from "@/lib/images";
import { formatReadingTime } from "@/lib/reading-time";
import { countTopics, filterByTag, rankRelatedArticles, toSearchEntry, type SearchIndexEntry, type TopicEntry } from "@/lib/article-discovery";

export type { SearchIndexEntry, TopicEntry };

const CONTENT_DIR = path.join(process.cwd(), "content");

export const LAUNCH_COLLECTION = [
  ["relationships", "what-does-dry-texting-mean"], ["relationships", "what-is-a-situationship"], ["relationships", "first-date-guide"],
  ["entertainment", "how-to-find-new-music"], ["entertainment", "why-old-songs-go-viral-again"], ["gaming", "best-games-to-play-with-friends"],
  ["travel", "travelling-vietnam-first-timer-guide"], ["travel", "first-trip-without-overspending"], ["travel", "what-to-pack-for-a-3-day-trip"], ["travel", "travel-with-friends-without-ruining-friendship"],
  ["campus", "how-to-make-friends-at-university"], ["campus", "how-to-use-ai-for-studying"], ["money", "what-to-do-with-first-salary"],
] as const;

// Cached for a short TTL in production so a freshly published .mdx file
// shows up without needing a full server restart, while still avoiding a
// filesystem read on every single request. Dev always re-reads.
const CACHE_TTL_MS = 60_000;
let cache: Article[] | null = null;
let cachedAt = 0;

export function getAllArticles(): Article[] {
  if (cache && process.env.NODE_ENV !== "development" && Date.now() - cachedAt < CACHE_TTL_MS) return cache;

  const articles: Article[] = [];

  for (const cat of CATEGORIES) {
    const dir = path.join(CONTENT_DIR, cat.slug);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const fm = data as ArticleFrontmatter;

      // Draft articles stay on disk (and are still readable directly by
      // slug if ever needed) but never surface in any public listing.
      if (fm.status === "draft") continue;

      articles.push({
        ...fm,
        ...resolveImage(fm.image, fm.imageAlt),
        category: cat.slug,
        slug,
        content,
        // The body is the source of truth. Frontmatter estimates drift as
        // stories are edited, so calculate the reader-facing value here.
        readingTime: formatReadingTime(content),
      });
    }
  }

  articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  cache = articles;
  cachedAt = Date.now();
  return articles;
}

export function getArticlesByCategory(category: Category): Article[] {
  return getAllArticles().filter((a) => a.category === category);
}

export function getArticlesByCategories(categories: Category[]): Article[] {
  return getAllArticles().filter((a) => categories.includes(a.category));
}

export function getArticleBySlug(category: Category, slug: string): Article | undefined {
  return getAllArticles().find((a) => a.category === category && a.slug === slug);
}

export function getFeaturedArticle(category?: Category): Article | undefined {
  const pool = category ? getArticlesByCategory(category) : getAllArticles();
  return pool.find((a) => a.featured) ?? pool[0];
}

export function getLatestArticles(limit = 9): Article[] {
  return getAllArticles().slice(0, limit);
}

export function getLaunchArticles(): Article[] {
  return LAUNCH_COLLECTION.map(([category, slug]) => getArticleBySlug(category, slug)).filter(Boolean) as Article[];
}

// MDX-only pool. Pages that should include Appwrite stories pass the full
// catalogue to rankRelatedArticles (lib/article-discovery.ts) instead.
export function getRelatedArticles(article: Article, limit = 3): Article[] {
  return rankRelatedArticles(article, getAllArticles(), limit);
}

export function getAllTopics(): TopicEntry[] {
  return countTopics(getAllArticles());
}

// How many days a newly published article gets treated as "fresh" for
// Trending — so it can surface ahead of older, unflagged, zero-reaction
// articles instead of being buried behind whatever historically got a
// reaction. Editorial `trending`/`trendingRank` still wins over freshness.
const TRENDING_FRESH_WINDOW_DAYS = 7;

function daysSincePublished(article: Article, now: Date): number {
  return (now.getTime() - new Date(article.date).getTime()) / (1000 * 60 * 60 * 24);
}

function isFreshArticle(article: Article, now: Date): boolean {
  // `trending: true` (no rank number) is an older, simpler "keep this
  // boosted" flag — treat it the same as always being inside the fresh
  // window, so existing content that only sets that flag keeps working.
  if (article.trending) return true;
  const days = daysSincePublished(article, now);
  return days >= 0 && days <= TRENDING_FRESH_WINDOW_DAYS;
}

// Shared ranking for any "Trending" surface (homepage widget, /trending
// page).
//
// For non-programmer editors: set `trendingRank: 1` (2, 3, ...) in an
// article's frontmatter to manually pin its position — no other field is
// needed. A manual rank always wins and ignores publish date entirely.
// Leave `trendingRank` out and the article instead ranks by how recently it
// was published, then by reader reactions — so a brand-new article isn't
// stuck behind old articles just because nobody has reacted to it yet.
export function compareTrending(
  a: Article,
  b: Article,
  reactionTotals: Map<string, number>,
  now: Date = new Date(),
): number {
  const aRanked = typeof a.trendingRank === "number";
  const bRanked = typeof b.trendingRank === "number";
  if (aRanked !== bRanked) return Number(bRanked) - Number(aRanked);
  if (aRanked && bRanked) return (a.trendingRank as number) - (b.trendingRank as number);

  const aFresh = isFreshArticle(a, now);
  const bFresh = isFreshArticle(b, now);
  if (aFresh !== bFresh) return Number(bFresh) - Number(aFresh);
  if (aFresh && bFresh) {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }

  const reactionDifference = (reactionTotals.get(b.slug) ?? 0) - (reactionTotals.get(a.slug) ?? 0);
  if (reactionDifference !== 0) return reactionDifference;

  return new Date(b.date).getTime() - new Date(a.date).getTime();
}


export function getArticlesByTag(tag: string): Article[] {
  return filterByTag(getAllArticles(), tag);
}

export function getSearchIndex(): SearchIndexEntry[] {
  return getAllArticles().map(toSearchEntry);
}
