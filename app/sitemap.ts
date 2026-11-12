import type { MetadataRoute } from "next";
import { getPublicCategories } from "@/lib/categories";
import { getSiteUrl } from "@/lib/seo";
import { getQuestions } from "@/lib/questions";
import { questionIndexing } from "@/lib/question-indexing";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { buildTopicIndex, getEligibleTopics, topicPath } from "@/lib/topics";

// `/music` is excluded: it redirects to the homepage.
// `/pulse`, `/daily-drop`, `/saved`, `/search` and `/community` are
// noindex utility or ephemeral pages.
// `/metro` is excluded: content/metro-picks.json is currently empty, so the
// route renders with no picks — not a public-ready page yet.
const STATIC_ROUTES = [
  "", "/trending", "/topics", "/about", "/editorial-policy", "/contact", "/privacy", "/terms", "/questions",
    "/play", "/play/trivia", "/play/what-to-play", "/play/multiplayer", "/play/gaming-culture", "/play/obby", "/play/rush", "/play/breaker", "/gaming", "/play/stay-out",
    "/play/group-chat", "/play/red-flag-green-flag", "/play/would-you-rather", "/play/weekend-picker", "/play/quick-draw", "/what-if/phone-free-week",
  "/tools", "/tools/student-budget-calculator", "/tools/cgpa-calculator", "/tools/trip-budget-calculator",
  "/tools/bill-splitter", "/tools/attendance-calculator", "/tools/word-counter", "/tools/date-calculator", "/tools/percentage-calculator", "/tools/focus-timer", "/tools/compatibility-check",
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

  for (const cat of getPublicCategories()) {
    if (!entries.some((entry) => entry.url === `${base}/${cat.slug}`)) {
      entries.push({ url: `${base}/${cat.slug}` });
    }
  }

  // MDX, generated and community articles (all pages of each Appwrite
  // collection). Hidden-desk articles stay listed; only their landing pages
  // redirect.
  const seen = new Set(entries.map((entry) => entry.url));
  const articles = await getDiscoverableArticles();
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

  // Only questions with their own guidance; the rest are noindex.
  for (const question of getQuestions().filter((item) => questionIndexing(item.slug).index)) {
    const url = `${base}/questions/${question.slug}`;
    if (!entries.some((entry) => entry.url === url)) entries.push({ url });
  }

  return entries;
}
