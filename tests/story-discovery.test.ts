import test from "node:test";
import assert from "node:assert/strict";
import { getHomepageTrendingArticles, selectFreshStories } from "../lib/story-discovery.ts";
import type { Article } from "../types/article.ts";

const article = (slug: string, category: string, date: string) => ({ slug, category, date } as unknown as Article);

test("fresh stories exclude trending stories and stay limited to three", () => {
  const trending = [article("one", "travel", "2026-09-20"), article("two", "gaming", "2026-09-19"), article("three", "money", "2026-09-18")];
  const fresh = selectFreshStories([...trending, article("four", "culture", "2026-09-17"), article("five", "campus", "2026-09-16")], new Set(trending.map((item) => item.slug)));
  assert.equal(fresh.length, 2);
  assert.deepEqual(fresh.map((item) => item.slug), ["four", "five"]);
});

test("an exact final Trending ranking can never appear in Fresh Stories", () => {
  const finalTrending = [article("ranked-ai", "campus", "2026-09-20"), article("ranked-travel", "travel", "2026-09-19"), article("ranked-game", "gaming", "2026-09-18")];
  const fresh = selectFreshStories([
    ...finalTrending,
    article("fresh-culture", "culture", "2026-09-17"),
  ], new Set(finalTrending.map((item) => item.slug)));
  assert.equal(fresh.some((item) => finalTrending.some((ranked) => ranked.slug === item.slug)), false);
});

test("fresh stories diversify categories when possible", () => {
  const fresh = selectFreshStories([
    article("travel-1", "travel", "2026-09-20"),
    article("travel-2", "travel", "2026-09-19"),
    article("gaming-1", "gaming", "2026-09-18"),
    article("culture-1", "culture", "2026-09-17"),
  ], new Set(), 3);
  assert.deepEqual(fresh.map((item) => item.slug), ["travel-1", "gaming-1", "culture-1"]);
});

test("fresh stories gracefully handle a small pool", () => {
  const fresh = selectFreshStories([article("only", "travel", "2026-09-20")], new Set(["missing"]));
  assert.deepEqual(fresh.map((item) => item.slug), ["only"]);
});

test("article Trending Now status uses the same final ranking source", () => {
  const articles = [
    article("hero", "travel", "2026-09-20"),
    article("ranked", "gaming", "2026-09-18"),
    article("other", "culture", "2026-09-19"),
    article("newer", "money", "2026-09-20"),
    article("newest", "style", "2026-09-21"),
  ];
  const ranked = getHomepageTrendingArticles(articles, new Map([["ranked", 4]]));
  assert.deepEqual(ranked.map((item) => item.slug), ["ranked", "newest", "newer"]);
  assert.equal(ranked.some((item) => item.slug === "ranked"), true);
  assert.equal(getHomepageTrendingArticles(articles, new Map()).some((item) => item.slug === "ranked"), false);
});

test("homepage discovery excludes the Daily Drop slug before final Trending", () => {
  const articles = [article("hero", "travel", "2026-09-20"), article("daily-drop-story", "culture", "2026-09-21"), article("next", "gaming", "2026-09-20"), article("other", "money", "2026-09-19")];
  const trending = getHomepageTrendingArticles(articles, new Map([["daily-drop-story", 100], ["next", 5]]), new Map(), 3, new Set(["daily-drop-story"]));
  assert.equal(trending.some((item) => item.slug === "daily-drop-story"), false);
});
