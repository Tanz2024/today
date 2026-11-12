import type { Article } from "@/types/article";

// The fields visitor scoring reads, so lightweight article summaries (for
// example the Play recommendation candidates) can be scored without the body.
export type ScorableArticle = Pick<Article, "slug" | "category" | "title" | "description" | "tags" | "date" | "updated">;

export const HOMEPAGE_INTERESTS = [
  "Culture", "Relationships", "Music", "Entertainment", "Gaming",
  "Style", "Travel", "Campus", "Money", "Wellbeing",
] as const;

export type HomepageInterest = (typeof HOMEPAGE_INTERESTS)[number];
export const HOMEPAGE_INTERESTS_KEY = "brisastory:homepage-interests";
export const HOMEPAGE_LAST_VISIT_KEY = "brisastory:homepage-last-visit";

export function normalizeArticleId(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

export function dedupeHomepageArticles<T extends { slug: string }>(items: T[], claimed = new Set<string>()) {
  const result: T[] = [];
  const seen = new Set([...claimed].map(normalizeArticleId));
  for (const item of items) {
    const id = normalizeArticleId(item.slug);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

export function readHomepageInterests(storage: Pick<Storage, "getItem"> | null): HomepageInterest[] {
  try {
    const value = storage?.getItem(HOMEPAGE_INTERESTS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is HomepageInterest => (HOMEPAGE_INTERESTS as readonly string[]).includes(item)).slice(0, HOMEPAGE_INTERESTS.length)
      : [];
  } catch { return []; }
}

export function hasPersonalizationSignal(interests: readonly string[], recentlyRead: readonly string[]) {
  return interests.length > 0 || recentlyRead.length >= 2;
}

function articleMatchesInterest(article: ScorableArticle, interest: string) {
  const text = `${article.category} ${article.title} ${article.description} ${article.tags.join(" ")}`.toLowerCase();
  const terms: Record<string, string> = {
    culture: "culture", relationships: "relationship dating friendship", music: "music song artist", entertainment: "entertainment film tv streaming", gaming: "gaming game", style: "style fashion beauty", travel: "travel city", campus: "campus school university", money: "money work finance", wellbeing: "wellbeing self-care health",
  };
  return (terms[interest.toLowerCase()] ?? interest).split(" ").some((term) => text.includes(term));
}

export function scoreArticleForVisitor(article: ScorableArticle, options: { interests?: readonly string[]; recentlyRead?: readonly string[]; recentTopics?: readonly string[]; editorialScore?: number } = {}) {
  const interests = options.interests ?? [];
  const recent = new Set((options.recentlyRead ?? []).map(normalizeArticleId));
  const topicText = `${article.category} ${article.tags.join(" ")}`.toLowerCase();
  const interestScore = interests.reduce((score, interest) => score + (articleMatchesInterest(article, interest) ? 30 : 0), 0);
  const topicScore = (options.recentTopics ?? []).some((topic) => topicText.includes(topic.toLowerCase())) ? 12 : 0;
  const recency = Math.max(0, 14 - Math.floor((Date.now() - new Date(article.updated || article.date).getTime()) / 86_400_000));
  return (options.editorialScore ?? 0) + interestScore + topicScore + recency + (recent.has(normalizeArticleId(article.slug)) ? -45 : 18);
}
