// Pure discovery helpers shared by MDX and Appwrite-backed articles. No I/O:
// callers pass the article pool (see lib/article-catalog.ts).
import type { Article, ArticleSource } from "@/types/article";
import { getPublicDeskSlug } from "./categories.ts";
import { FALLBACK_IMAGE } from "./images.ts";

export const articleKey = (article: Pick<Article, "category" | "slug">) => `${article.category}/${article.slug}`;

/** Normalize legacy article tags without mutating the source article. */
export function normalizeArticleTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === "string");
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

// MDX first (already newest-first), then Appwrite stories not shadowed by an
// MDX file at the same URL. The order matches what the homepage always used.
export function mergeArticleSources(local: Article[], remote: Article[]): Article[] {
  const seen = new Set<string>();
  const merged: Article[] = [];
  for (const article of [...local, ...remote]) {
    if (article.status === "draft") continue;
    const key = articleKey(article);
    if (seen.has(key)) continue;
    seen.add(key);
    // Return a shallow normalized copy so every downstream discovery
    // consumer receives a safe tag array without mutating source data.
    merged.push({ ...article, tags: normalizeArticleTags(article.tags) });
  }
  return merged;
}

// Only what discovery surfaces need; safe to send to the client.
export interface ArticleSummary {
  slug: string;
  category: string;
  title: string;
  displayTitle?: string;
  description: string;
  image: string;
  imageAlt: string;
  date: string;
  updated: string;
  author?: string;
  tags: string[];
  readingTime: string;
  source: ArticleSource;
  status: "published";
}

export function toArticleSummary(article: Article): ArticleSummary {
  return {
    slug: article.slug,
    category: article.category,
    title: article.title,
    ...(article.displayTitle ? { displayTitle: article.displayTitle } : {}),
    description: article.description,
    image: article.image,
    imageAlt: article.imageAlt,
    date: article.date,
    updated: article.updated || article.date,
    ...(article.author ? { author: article.author } : {}),
    tags: normalizeArticleTags(article.tags),
    readingTime: article.readingTime,
    source: article.source ?? "mdx",
    status: "published",
  };
}

// A real photo suitable for og:image / Article.image. The editorial SVG
// placeholder is a UI fallback, not article imagery.
export function hasIndexableImage(image: string | undefined): image is string {
  return Boolean(image) && image !== FALLBACK_IMAGE && !/\.svg(?:[?#]|$)/i.test(image as string);
}

const STOP_WORDS = ["this", "that", "with", "from", "what", "when", "your", "they", "about"];
const tokenize = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((token) => token.length > 3 && !STOP_WORDS.includes(token)));

// Topic-relevance matches only (shared tags/keywords), best first.
export function scoreRelatedArticles(article: Article, pool: Article[], limit = 3, now = Date.now()): Article[] {
  const all = mergeArticleSources(pool.filter((a) => a.slug !== article.slug), []);
  const sourceTagsList = normalizeArticleTags(article.tags);
  const sourceTokens = tokenize(`${article.title} ${article.description} ${sourceTagsList.join(" ")}`);
  const sourceTags = new Set(sourceTagsList.map((tag) => tag.toLowerCase().trim()));
  const scored = all.map((candidate) => {
    const candidateTags = normalizeArticleTags(candidate.tags);
    const candidateTokens = tokenize(`${candidate.title} ${candidate.description} ${candidateTags.join(" ")}`);
    const sharedTokens = [...sourceTokens].filter((token) => candidateTokens.has(token)).length;
    const sharedTags = candidateTags.filter((tag) => sourceTags.has(tag.toLowerCase().trim())).length;
    const recency = Math.max(0, 1 - Math.max(0, now - new Date(candidate.date).getTime()) / (1000 * 60 * 60 * 24 * 90));
    let score = sharedTags * 5 + sharedTokens * 2 + recency * 0.5;
    if (article.articleType && candidate.articleType === article.articleType) score += 1.5;
    if (candidate.category === article.category) score += 0.75;
    return { article: candidate, score, sharedTokens, sharedTags };
  }).filter((item) => item.sharedTokens > 0 || item.sharedTags > 0);
  scored.sort((a, b) => b.score - a.score || new Date(b.article.date).getTime() - new Date(a.article.date).getTime());
  const selected: Article[] = [];
  const selectedTopics = new Set<string>();
  for (const item of scored) {
    const topicKey = [...tokenize(item.article.title)].slice(0, 4).join(" ");
    if (selectedTopics.has(topicKey)) continue;
    selected.push(item.article); selectedTopics.add(topicKey);
    if (selected.length >= limit) break;
  }
  return selected;
}

// Related cards, always `limit` long when the catalogue allows:
// 1. topic relevance, 2. recent stories from the same public desk,
// 3. recent stories site-wide. Never the article itself or a repeated URL.
export function rankRelatedArticles(article: Article, pool: Article[], limit = 3, now = Date.now()): Article[] {
  const selected = scoreRelatedArticles(article, pool, limit, now);
  if (selected.length >= limit) return selected;
  const taken = new Set([articleKey(article), ...selected.map(articleKey)]);
  const recent = mergeArticleSources(pool.filter((a) => a.slug !== article.slug), [])
    .filter((candidate) => !taken.has(articleKey(candidate)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const desk = getPublicDeskSlug(article.category);
  const sameDesk = recent.filter((candidate) => getPublicDeskSlug(candidate.category) === desk);
  const elsewhere = recent.filter((candidate) => getPublicDeskSlug(candidate.category) !== desk);
  return [...selected, ...sameDesk, ...elsewhere].slice(0, limit);
}

export interface TopicEntry {
  tag: string;
  count: number;
}

export function countTopics(articles: Article[]): TopicEntry[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of normalizeArticleTags(article.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function filterByTag(articles: Article[], tag: string): Article[] {
  return articles.filter((a) => a.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
}

export interface SearchIndexEntry {
  slug: string;
  /** "review" | "comparison" | "guide" … for AI coverage; set by the search page. */
  contentKind?: string;
  category: string;
  title: string;
  displayTitle?: string;
  description: string;
  tags: string[];
  image: string;
  imageAlt: string;
  date: string;
}

export function toSearchEntry(article: Article): SearchIndexEntry {
  return {
    slug: article.slug,
    category: article.category,
    title: article.title,
    ...(article.displayTitle ? { displayTitle: article.displayTitle } : {}),
    description: article.description,
    tags: normalizeArticleTags(article.tags),
    image: article.image,
    imageAlt: article.imageAlt,
    date: article.date,
  };
}
