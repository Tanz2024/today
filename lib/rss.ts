// RSS 2.0 for the unified catalogue. Pure, so escaping and dates are testable.
import type { Article } from "@/types/article";
import { mergeArticleSources } from "./article-discovery.ts";
import { resolveArticleAuthor } from "./structured-data.ts";

export const FEED_PATH = "/feed.xml";
export const FEED_ITEM_LIMIT = 50;

// Escapes the five XML entities and drops characters XML 1.0 forbids.
export function escapeXml(value: string): string {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RFC 822 date from the article's persisted date. Never "now".
export function rssDate(value: string): string | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toUTCString();
}

const tag = (name: string, value: string | undefined) => (value ? `<${name}>${escapeXml(value)}</${name}>` : "");

export function buildRssFeed(articles: Article[], siteUrl: string, limit = FEED_ITEM_LIMIT): string {
  const items = mergeArticleSources(articles, [])
    .filter((article) => rssDate(article.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.slug.localeCompare(b.slug))
    .slice(0, limit);

  // Channel date follows the newest item, so rebuilding does not change it.
  const lastBuildDate = items[0] ? rssDate(items[0].updated || items[0].date) : undefined;

  const body = items.map((article) => {
    const url = `${siteUrl}/${article.category}/${article.slug}`;
    return [
      "<item>",
      tag("title", article.title),
      tag("link", url),
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      tag("pubDate", rssDate(article.date)),
      tag("description", article.description),
      tag("dc:creator", resolveArticleAuthor(article).name),
      ...article.tags.map((value) => tag("category", value)),
      "</item>",
    ].join("");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "<channel>",
    tag("title", "TodayAI"),
    tag("link", siteUrl),
    tag("description", "Culture, relationships, campus life, money, travel, style and everyday stories for a new generation."),
    tag("language", "en"),
    `<atom:link href="${escapeXml(`${siteUrl}${FEED_PATH}`)}" rel="self" type="application/rss+xml"/>`,
    tag("lastBuildDate", lastBuildDate),
    ...body,
    "</channel>",
    "</rss>",
  ].join("\n");
}
