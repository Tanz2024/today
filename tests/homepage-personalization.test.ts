import test from "node:test";
import assert from "node:assert/strict";
import { dedupeHomepageArticles, hasPersonalizationSignal, scoreArticleForVisitor } from "../lib/homepage-personalization.ts";
import { ARTICLE_SOURCE_MAX_AGE, captureArticleSource, readArticleSource, trackHomepageEvent } from "../lib/homepage-analytics.ts";
import type { Article } from "../types/article.ts";

const article = (slug: string, category = "culture"): Article => ({ slug, category, title: `${category} story`, description: "A useful story", tags: [category], date: new Date().toISOString(), image: "/x.jpg", imageAlt: "x", content: "x", readingTime: "2 min" });

test("homepage dedupe normalizes ids and preserves priority order", () => {
  const result = dedupeHomepageArticles([article("/a/"), article("b"), article("a")], new Set(["b"]));
  assert.deepEqual(result.map((item) => item.slug), ["/a/"]);
});

test("personalization requires an explicit interest or meaningful history", () => {
  assert.equal(hasPersonalizationSignal([], []), false);
  assert.equal(hasPersonalizationSignal(["Music"], []), true);
  assert.equal(hasPersonalizationSignal([], ["a", "b"]), true);
});

test("visitor scoring favors matching unseen stories", () => {
  const music = article("music", "music");
  const culture = article("culture");
  const musicScore = scoreArticleForVisitor(music, { interests: ["Music"], recentlyRead: [] });
  const readScore = scoreArticleForVisitor(music, { interests: ["Music"], recentlyRead: ["music"] });
  assert.ok(musicScore > scoreArticleForVisitor(culture, { interests: ["Music"], recentlyRead: [] }));
  assert.ok(musicScore > readScore);
});

test("article source attribution is temporary and expires", () => {
  const data = new Map<string, string>();
  const storage = { setItem: (key: string, value: string) => data.set(key, value), getItem: (key: string) => data.get(key) ?? null, removeItem: (key: string) => data.delete(key) };
  captureArticleSource(storage, "trending", "story", 1000);
  assert.equal(readArticleSource(storage, "story", 1000), "trending");
  captureArticleSource(storage, "fresh", "story", 1000);
  assert.equal(readArticleSource(storage, "story", 1000 + ARTICLE_SOURCE_MAX_AGE + 1), null);
});

test("analytics helper safely forwards Umami events and metadata", () => {
  const calls: unknown[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: { umami: { track: (...args: unknown[]) => calls.push(args) } } });
  trackHomepageEvent("daily_drop_click", { module: "daily_drop", slug: "story" });
  assert.deepEqual(calls, [["daily_drop_click", { module: "daily_drop", slug: "story" }]]);
  delete (globalThis as { window?: unknown }).window;
});
