import "server-only";
import { cache } from "react";
import { getAllArticles } from "@/lib/articles";
import { getPublishedGeneratedArticlesResult } from "@/lib/generated-articles";
import { mergeArticleSources } from "@/lib/article-discovery";

// Every published article — MDX, generated and community — in one list.
// Appwrite rows come from the shared hourly cache (tags "articles" and
// "homepage-editorial"); React cache() reuses the merge within a request.
export const getDiscoverableArticles = cache(async () => {
  const remote = await getPublishedGeneratedArticlesResult();
  return mergeArticleSources(getAllArticles(), remote.status === "available" ? remote.articles : []);
});

// Homepage and other public discovery surfaces must not expose scheduled
// stories before their publication date.
export const getPublicDiscoverableArticles = cache(async () => {
  const now = Date.now();
  return (await getDiscoverableArticles()).filter((article) => {
    const publishedAt = new Date(article.date).getTime();
    return Number.isFinite(publishedAt) && publishedAt <= now;
  });
});
