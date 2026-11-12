export type RecommendationReason = "related" | "same_topic" | "new";
export type RecommendationQuestion = { slug: string; title: string; category: string; tags: string[]; updatedAt?: string };
export type PublicRecommendation = { slug: string; title: string; category: string; reason: RecommendationReason };

const normalizedTags = (tags: unknown) => Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];

const freshnessBonus = (updatedAt: string | undefined, now: number) => {
  if (!updatedAt) return 0;
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (now - timestamp) / 86_400_000);
  return Math.max(0, Math.min(20, 20 - (ageDays / 30) * 20));
};

export function recommendationAnalyticsMetadata(sourceQuestionSlug: string, targetQuestionSlug: string) {
  return { sourceQuestionSlug, targetQuestionSlug };
}

export function rankRecommendedQuestions(current: RecommendationQuestion, questions: RecommendationQuestion[], editorialSlugs: ReadonlySet<string> = new Set(), limit = 3, now = Date.now(), excludeSlugs: ReadonlySet<string> = new Set()): PublicRecommendation[] {
  const currentTags = normalizedTags(current.tags);
  const ranked = questions.filter((candidate) => candidate.slug !== current.slug).map((candidate) => {
    const editorial = editorialSlugs.has(candidate.slug);
    const sharedTopic = normalizedTags(candidate.tags).some((tag) => currentTags.includes(tag));
    const sameCategory = typeof current.category === "string" && typeof candidate.category === "string" && candidate.category === current.category;
    const freshness = freshnessBonus(candidate.updatedAt, now);
    const score = (editorial ? 100 : 0) + (sharedTopic ? 50 : 0) + (sameCategory ? 30 : 0) + freshness;
    const reason: RecommendationReason = editorial ? "related" : sharedTopic ? "same_topic" : "new";
    return { candidate, score, freshness, reason };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.freshness - a.freshness || a.candidate.slug.localeCompare(b.candidate.slug));
  const seen = new Set<string>();
  return ranked.flatMap(({ candidate, reason }) => {
    if (excludeSlugs.has(candidate.slug) || seen.has(candidate.slug)) return [];
    seen.add(candidate.slug);
    return [{ slug: candidate.slug, title: candidate.title, category: candidate.category, reason }];
  }).slice(0, Math.max(0, limit));
}
