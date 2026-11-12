import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { rankRecommendedQuestions, recommendationAnalyticsMetadata, type RecommendationQuestion } from "../lib/question-recommendations-core.ts";

const current: RecommendationQuestion = { slug: "current", title: "Current", category: "culture", tags: ["work"], updatedAt: "2026-09-01T00:00:00Z" };
const questions: RecommendationQuestion[] = [
  { slug: "fresh", title: "Fresh", category: "other", tags: [], updatedAt: "2026-10-01T00:00:00Z" },
  { slug: "topic", title: "Topic", category: "other", tags: ["work"], updatedAt: "2026-09-20T00:00:00Z" },
  { slug: "category", title: "Category", category: "culture", tags: [], updatedAt: "2026-09-15T00:00:00Z" }, current,
];
test("editorial relation ranks first and public shape hides score", () => { const result = rankRecommendedQuestions(current, questions, new Set(["category"]), 3, Date.parse("2026-10-01T00:00:00Z")); assert.equal(result[0].slug, "category"); assert.deepEqual(Object.keys(result[0]).sort(), ["category", "reason", "slug", "title"]); assert.equal(result[0].reason, "related"); });
test("same topic, current exclusion and limit work", () => { const result = rankRecommendedQuestions(current, [...questions, ...questions], new Set(), 2, Date.parse("2026-10-01T00:00:00Z")); assert.deepEqual(result.map((item) => item.slug), ["topic", "category"]); assert.equal(result.length, 2); assert.ok(!result.some((item) => item.slug === "current")); });
test("freshness orders otherwise equivalent candidates", () => { const result = rankRecommendedQuestions(current, [{ slug: "old", title: "Old", category: "other", tags: [], updatedAt: "2026-09-10T00:00:00Z" }, { slug: "new", title: "New", category: "other", tags: [], updatedAt: "2026-09-30T00:00:00Z" }], new Set(), 2, Date.parse("2026-10-01T00:00:00Z")); assert.deepEqual(result.map((item) => item.slug), ["new", "old"]); });
test("analytics metadata contains only public question slugs", () => { assert.deepEqual(recommendationAnalyticsMetadata("source", "target"), { sourceQuestionSlug: "source", targetQuestionSlug: "target" }); });
test("recommendation links render from server-provided props without client fetching", () => { const component = readFileSync(new URL("../components/questions/QuestionRecommendations.tsx", import.meta.url), "utf8"); const page = readFileSync(new URL("../app/questions/[slug]/page.tsx", import.meta.url), "utf8"); assert.match(component, /sourceQuestionSlug, recommendations/); assert.doesNotMatch(component, /fetch\(/); assert.match(page, /getRecommendedQuestions\(question\.slug, \{ excludeSlugs: new Set\(relatedQuestionSlugs\) \}\)/); assert.match(page, /recommendations=\{recommendations\}/); });
test("excluded candidates are skipped and lower-ranked candidates fill the limit", () => { const result = rankRecommendedQuestions(current, questions, new Set(), 3, Date.parse("2026-10-01T00:00:00Z"), new Set(["topic", "category", "missing", "topic"])); assert.deepEqual(result.map((item) => item.slug), ["fresh"]); });
test("malformed optional metadata is safe", () => { const malformed = [{ slug: "missing", title: "Missing", category: undefined, tags: undefined, updatedAt: "not-a-date" }, { slug: "future", title: "Future", category: "other", tags: "work", updatedAt: "2099-01-01T00:00:00Z" }] as unknown as RecommendationQuestion[]; const result = rankRecommendedQuestions(current, malformed, new Set(), 3, Date.parse("2026-10-01T00:00:00Z")); assert.deepEqual(result.map((item) => item.slug), ["future"]); });
