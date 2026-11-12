// Deterministic "likely orphan" check over the unified catalogue: which
// stories get no internal link from a desk's first page, a topic hub's first
// page, or another story's related cards. Homepage modules are curated and
// time-dependent, so they are deliberately not counted here.
import type { Article } from "@/types/article";
import { articleKey, mergeArticleSources, rankRelatedArticles } from "./article-discovery.ts";
import { getPublicDeskSlug } from "./categories.ts";
import { buildTopicIndex, getEligibleTopics } from "./topics.ts";

export interface InboundLinks {
  article: Article;
  desk: boolean;
  topics: number;
  related: number;
}

const DESK_PAGE_SIZE = 9;
const TOPIC_PAGE_SIZE = 12;

export function auditInboundLinks(pool: Article[], now = Date.now()): InboundLinks[] {
  const articles = mergeArticleSources(pool, []);
  const byNewest = [...articles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const onDeskFirstPage = new Set<string>();
  const deskCounts = new Map<string, number>();
  for (const article of byNewest) {
    const desk = getPublicDeskSlug(article.category);
    const count = deskCounts.get(desk) ?? 0;
    if (count < DESK_PAGE_SIZE) onDeskFirstPage.add(articleKey(article));
    deskCounts.set(desk, count + 1);
  }
  const topicLinks = new Map<string, number>();
  for (const topic of getEligibleTopics(buildTopicIndex(articles))) {
    for (const article of topic.articles.slice(0, TOPIC_PAGE_SIZE)) topicLinks.set(articleKey(article), (topicLinks.get(articleKey(article)) ?? 0) + 1);
  }
  const relatedLinks = new Map<string, number>();
  for (const article of articles) {
    for (const target of rankRelatedArticles(article, articles, 3, now)) relatedLinks.set(articleKey(target), (relatedLinks.get(articleKey(target)) ?? 0) + 1);
  }
  return articles.map((article) => ({
    article,
    desk: onDeskFirstPage.has(articleKey(article)),
    topics: topicLinks.get(articleKey(article)) ?? 0,
    related: relatedLinks.get(articleKey(article)) ?? 0,
  }));
}

export function findLikelyOrphans(pool: Article[], now = Date.now()): Article[] {
  return auditInboundLinks(pool, now)
    .filter((entry) => !entry.desk && entry.topics === 0 && entry.related === 0)
    .map((entry) => entry.article);
}
