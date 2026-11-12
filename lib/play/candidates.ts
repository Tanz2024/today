import "server-only";

import { getAllArticles } from "@/lib/articles";
import { getPublishedGeneratedArticles } from "@/lib/generated-articles";
import { getCachedReactionTotals } from "@/lib/reactions";
import { getCachedReadSessionCounts } from "@/lib/read-stats";
import { getHomepageTrendingArticles } from "@/lib/story-discovery";
import { getCategoryMeta } from "@/lib/categories";
import type { Article } from "@/types/article";
import type { PlayArticle } from "./recommendation.ts";

export type PlayCandidate = PlayArticle & { categoryName: string };

function toCandidate(article: Article, trendingIndex?: number): PlayCandidate {
  return {
    slug: article.slug,
    category: article.category,
    categoryName: getCategoryMeta(article.category)?.name ?? article.category,
    title: article.title,
    displayTitle: article.displayTitle,
    description: article.description.slice(0, 160),
    tags: article.tags.slice(0, 6),
    date: article.date,
    updated: article.updated,
    readingTime: article.readingTime,
    trendingIndex,
  };
}

// A small, body-free candidate list for the post-game recommendation. The
// pick itself happens in the browser from local signals, so showing it never
// needs a network request after the game ends.
export async function getPlayArticleCandidates(limit = 40): Promise<PlayCandidate[]> {
  const seen = new Set<string>();
  const all = [...getAllArticles(), ...(await getPublishedGeneratedArticles())].filter((article) => {
    if (article.status === "draft" || seen.has(article.slug)) return false;
    seen.add(article.slug);
    return true;
  });
  const slugs = all.map((article) => article.slug);
  const [reactions, reads] = await Promise.all([getCachedReactionTotals(slugs), getCachedReadSessionCounts(slugs)]);
  const trending = getHomepageTrendingArticles(all, reactions, reads, 6);
  const trendingIndex = new Map(trending.map((article, index) => [article.slug, index]));
  const newest = [...all].sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime());
  const ordered = [...trending, ...newest.filter((article) => !trendingIndex.has(article.slug))].slice(0, limit);
  return ordered.map((article) => toCandidate(article, trendingIndex.get(article.slug)));
}
