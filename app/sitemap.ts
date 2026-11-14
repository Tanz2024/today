import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { buildTopicIndex, getEligibleTopics, topicPath } from "@/lib/topics";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOPICS } from "@/lib/ai-taxonomy";
import { AI_UTILITIES, isAiUtilitiesEnabled } from "@/lib/ai-utilities";

// Retained, AI-focused public routes only. Retired sections (lifestyle desks,
// questions, polls, community, non-AI games and calculators) are gone.
const STATIC_ROUTES = [
  "", "/ai", "/news", "/guides", "/compare", "/topics", "/ai-tools",
  "/tools", "/tools/word-counter",
  "/tools/ai-writing-studio", "/tools/ai-resume-assistant", "/tools/ai-image-document-studio", "/tools/ai-study-assistant",
  "/play", "/play/word-detective", "/play/quick-draw",
  "/about", "/editorial-policy", "/contact", "/privacy", "/terms",
];

// Only routes with a real, known modification date — content-driven pages
// (categories, articles) supply their own instead. No deployment timestamps.
const KNOWN_LAST_MODIFIED: Record<string, string> = {};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => {
    const known = KNOWN_LAST_MODIFIED[route];
    return known
      ? { url: `${base}${route}`, lastModified: new Date(known) }
      : { url: `${base}${route}` };
  });

  // AI utilities are noindex until a provider is switched on; list them only then.
  if (isAiUtilitiesEnabled()) {
    for (const tool of AI_UTILITIES) entries.push({ url: `${base}/tools/${tool.slug}` });
  }

  // AI news topic hubs that have stories.
  // AI articles only (MDX and generated). Non-AI archive articles now 404.
  const seen = new Set(entries.map((entry) => entry.url));
  const articles = selectAiArticles(await getPublicDiscoverableArticles());
  // Same threshold as app/news/[topic] (noindex below 2 stories): never list
  // a noindexed page in the sitemap.
  for (const topic of AI_TOPICS.filter((item) => articles.filter((article) => article.aiTopic === item.slug).length >= 2)) {
    const url = `${base}/news/${topic.slug}`;
    seen.add(url);
    entries.push({ url });
  }
  for (const article of articles) {
    const url = `${base}/${article.category}/${article.slug}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const modified = article.updated || article.date;
    entries.push(modified ? { url, lastModified: new Date(modified) } : { url });
  }

  // Topic hubs with enough stories only; lastModified is the newest
  // qualifying story, so it only moves when content does.
  for (const topic of getEligibleTopics(buildTopicIndex(articles))) {
    const url = `${base}${topicPath(topic)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    entries.push({ url, lastModified: new Date(topic.lastModified) });
  }

  return entries;
}
