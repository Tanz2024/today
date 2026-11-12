// Topic hubs (/topics/[slug]) built in memory from the unified article
// catalogue. Pure: no I/O, so it is shared by pages, sitemap and tests.
import type { Article } from "@/types/article";
import { articleKey, normalizeArticleTags } from "./article-discovery.ts";
import { getPublicCategories, getPublicDeskSlug } from "./categories.ts";

export const MIN_TOPIC_STORIES = 3;

// Identity of a tag: case and whitespace differences are the same topic.
export function normalizeTag(tag: string): string {
  return tag.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

// FNV-1a, base36: a short stable suffix that depends only on the tag itself.
function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0").slice(0, 6);
}

// Deterministic, lowercase, URL-safe slug. Stored tags are never changed.
export function tagSlug(tag: string): string {
  const slug = normalizeTag(tag)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `topic-${stableHash(normalizeTag(tag))}`;
}

export interface Topic {
  slug: string;
  name: string;
  /** Newest first, one entry per article URL. */
  articles: Article[];
  count: number;
  /** Newest qualifying article's updated/published date. */
  lastModified: string;
  /** Public desk most of its stories belong to. */
  desk: string;
  eligible: boolean;
}

// Tags that just repeat a public desk ("Travel", "Culture", "Sex & Health")
// would duplicate the desk page, so they never become hubs.
function deskSlugs(): Set<string> {
  return new Set(getPublicCategories().flatMap((category) => [category.slug, tagSlug(category.name)]));
}

const time = (value: string | undefined) => (value ? new Date(value).getTime() : 0) || 0;

export function buildTopicIndex(articles: Article[], minStories = MIN_TOPIC_STORIES): Topic[] {
  const groups = new Map<string, { spellings: Map<string, number>; articles: Map<string, Article> }>();
  for (const article of articles) {
    if (article.status === "draft") continue;
    // Remote/legacy editorial rows can omit tags or store them as a scalar.
    // A malformed optional field must not make topic generation fail at build.
    const tags = Array.isArray(article.tags) ? article.tags.filter((tag): tag is string => typeof tag === "string") : [];
    for (const tag of tags) {
      const key = normalizeTag(tag);
      if (!key) continue;
      const group = groups.get(key) ?? { spellings: new Map(), articles: new Map() };
      group.spellings.set(tag.trim(), (group.spellings.get(tag.trim()) ?? 0) + 1);
      group.articles.set(articleKey(article), article);
      groups.set(key, group);
    }
  }

  // Distinct tags that slug the same ("Sex & Health" / "Sex and Health") are
  // never merged: the alphabetically first keeps the plain slug, the others
  // get a suffix derived only from their own text, so URLs stay stable.
  const byBase = new Map<string, string[]>();
  for (const key of groups.keys()) {
    const base = tagSlug(key);
    byBase.set(base, [...(byBase.get(base) ?? []), key]);
  }
  const slugFor = new Map<string, string>();
  for (const [base, keys] of byBase) {
    keys.sort();
    keys.forEach((key, index) => slugFor.set(key, index === 0 ? base : `${base}-${stableHash(key)}`));
  }

  const excluded = deskSlugs();
  const topics: Topic[] = [];
  for (const [key, group] of groups) {
    const list = [...group.articles.values()].sort((a, b) => time(b.date) - time(a.date) || a.slug.localeCompare(b.slug));
    const name = [...group.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const desks = new Map<string, number>();
    for (const article of list) desks.set(getPublicDeskSlug(article.category), (desks.get(getPublicDeskSlug(article.category)) ?? 0) + 1);
    const desk = [...desks.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const slug = slugFor.get(key)!;
    topics.push({
      slug,
      name,
      articles: list,
      count: list.length,
      lastModified: new Date(Math.max(...list.map((article) => time(article.updated || article.date)))).toISOString(),
      desk,
      eligible: list.length >= minStories && !excluded.has(slug),
    });
  }
  return topics.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getEligibleTopics(topics: Topic[]): Topic[] {
  return topics.filter((topic) => topic.eligible);
}

export function topicPath(topic: Pick<Topic, "slug">): string {
  return `/topics/${topic.slug}`;
}

// Up to `max` hub links for an article, in the article's own tag order.
export function articleTopicLinks(article: Pick<Article, "tags">, topics: Topic[], max = 4): Topic[] {
  const byKey = new Map(topics.filter((topic) => topic.eligible).map((topic) => [normalizeTag(topic.name), topic]));
  const seen = new Set<string>();
  const links: Topic[] = [];
  for (const tag of normalizeArticleTags(article.tags)) {
    const topic = byKey.get(normalizeTag(tag));
    if (!topic || seen.has(topic.slug)) continue;
    seen.add(topic.slug);
    links.push(topic);
    if (links.length >= max) break;
  }
  return links;
}
