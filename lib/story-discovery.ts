import type { Article } from "../types/article";

export function getHomepageTrendingArticles(articles: Article[], reactionTotals: Map<string, number>, readTotals = new Map<string, number>(), limit = 3, excludedSlugs = new Set<string>(), engagementScores = new Map<string, number>()): Article[] {
  const featured = articles.find((article) => article.homepageHero) ?? articles.find((article) => article.featured) ?? articles[0];
  const culture = articles.find((article) => article.slug !== featured?.slug && (article.homepageCulture || article.category === "entertainment"));
  const travel = articles.find((article) => article.slug !== featured?.slug && (article.homepageTravel || article.category === "travel"));
  const excluded = new Set([featured?.slug, culture?.slug, travel?.slug, ...excludedSlugs]);
  return articles.filter((article) => !excluded.has(article.slug)).sort((a, b) => {
    const aRank = typeof a.trendingRank === "number";
    const bRank = typeof b.trendingRank === "number";
    if (aRank !== bRank) return Number(bRank) - Number(aRank);
    if (aRank && bRank) return (a.trendingRank as number) - (b.trendingRank as number);
    const score = (article: Article) => engagementScores.get(article.slug) ?? (reactionTotals.get(article.slug) ?? 0) * 3 + (readTotals.get(article.slug) ?? 0) * 2;
    const scoreDifference = score(b) - score(a);
    return scoreDifference || new Date(b.date).getTime() - new Date(a.date).getTime();
  }).slice(0, limit);
}

export function selectFreshStories(
  articles: Article[],
  excludedSlugs: Set<string>,
  limit = 3,
  reactionTotals = new Map<string, number>(),
  readTotals = new Map<string, number>(),
  now = Date.now(),
  engagementScores = new Map<string, number>(),
): Article[] {
  const candidates = articles
    .filter((article) => !excludedSlugs.has(article.slug))
    .sort((a, b) => {
      const score = (article: Article) => {
        const ageDays = Math.max(0, (now - new Date(article.date).getTime()) / 86_400_000);
        const freshness = 1 / (1 + ageDays / 3);
        const engagement = Math.log1p(engagementScores.get(article.slug) ?? (reactionTotals.get(article.slug) ?? 0) * 3 + (readTotals.get(article.slug) ?? 0) * 2);
        return freshness * 100 + engagement * 4;
      };
      return score(b) - score(a) || new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  const selected: Article[] = [];
  const usedCategories = new Set<string>();
  for (const article of candidates) {
    if (selected.length >= limit) break;
    if (!usedCategories.has(article.category)) {
      selected.push(article);
      usedCategories.add(article.category);
    }
  }
  for (const article of candidates) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.slug === article.slug)) selected.push(article);
  }
  return selected;
}

export function selectMostEngagedFeature(
  articles: Article[],
  reactionTotals: Map<string, number>,
  readTotals: Map<string, number>,
  predicate: (article: Article) => boolean,
  excludedSlugs: Set<string>,
  engagementScores = new Map<string, number>(),
): Article | undefined {
  const score = (article: Article) =>
    engagementScores.get(article.slug) ?? (reactionTotals.get(article.slug) ?? 0) * 3 +
    (readTotals.get(article.slug) ?? 0) * 2;

  return articles
    .filter((article) => !excludedSlugs.has(article.slug) && predicate(article))
    .sort((a, b) => score(b) - score(a) || new Date(b.date).getTime() - new Date(a.date).getTime())
    .find(Boolean);
}

export function rankByEngagement(
  articles: Article[],
  reactionTotals: Map<string, number>,
  readTotals: Map<string, number>,
  engagementScores = new Map<string, number>(),
): Article[] {
  const score = (article: Article) =>
    engagementScores.get(article.slug) ?? (reactionTotals.get(article.slug) ?? 0) * 3 +
    (readTotals.get(article.slug) ?? 0) * 2;

  return [...articles].sort(
    (a, b) => score(b) - score(a) || new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
