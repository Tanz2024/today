import test from "node:test";
import assert from "node:assert/strict";
import { malaysiaEditionDate, selectCurationAssignments } from "../lib/homepage-curation-core.ts";

const now = new Date("2026-09-21T16:00:00.000Z");
const articles = [
  { id: "a", slug: "a", category: "travel", date: "2026-09-20", status: "published" },
  { id: "b", slug: "b", category: "gaming", date: "2026-09-19", status: "published" },
  { id: "c", slug: "c", category: "music", date: "2026-09-18", status: "published" },
  { id: "draft", slug: "draft", category: "travel", date: "2026-09-21", status: "candidate" },
];

test("daily edition date uses Malaysia UTC+8", () => assert.equal(malaysiaEditionDate(now), "2026-09-22"));
test("published articles are eligible but drafts are not", () => {
  const result = selectCurationAssignments({ section: "fresh", mode: "AUTO", slots: 5 }, articles, now);
  assert.deepEqual(result.map((item) => item.articleSlug), ["a", "b", "c"]);
  assert.equal(result.some((item) => item.articleSlug === "draft"), false);
});
test("hybrid pins remain first and auto fill excludes them", () => {
  const result = selectCurationAssignments({ section: "trending", mode: "HYBRID", slots: 3, pinnedArticleIds: ["b"] }, articles, now);
  assert.deepEqual(result.map((item) => item.articleSlug), ["b", "a", "c"]);
  assert.equal(new Set(result.map((item) => item.articleSlug)).size, result.length);
  assert.equal(result[0].source, "manual");
});
test("manual mode never auto-replaces valid pinned articles", () => {
  const result = selectCurationAssignments({ section: "hero", mode: "MANUAL", slots: 3, pinnedArticleIds: ["a"] }, articles, now);
  assert.deepEqual(result.map((item) => item.articleSlug), ["a"]);
});
test("unpublished pins fall back and insufficient content is not duplicated", () => {
  const result = selectCurationAssignments({ section: "fresh", mode: "HYBRID", slots: 5, pinnedArticleIds: ["draft"] }, articles, now);
  assert.deepEqual(result.map((item) => item.articleSlug), ["a", "b", "c"]);
});

test("homepage curation payload keeps section lookups after JSON serialization", () => {
  const payload = {
    configs: { trending: { section: "trending", mode: "MANUAL", slots: 3 } },
    assignments: { trending: [{ section: "trending", articleSlug: "b", slot: 1 }] },
  };
  const roundTripped = JSON.parse(JSON.stringify(payload)) as typeof payload;
  assert.equal(roundTripped.configs.trending.section, "trending");
  assert.deepEqual(roundTripped.assignments.trending.map((item) => item.articleSlug), ["b"]);
});
