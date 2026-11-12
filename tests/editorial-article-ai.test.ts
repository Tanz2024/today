import test from "node:test";
import assert from "node:assert/strict";
import { classifyEditorialCategory, detectStructuralRepetition, normalizeArticleTags, repairDisplayTitle, validateGeneratedArticle, validateHeadlineQuality } from "../lib/editorial-article-ai.mjs";

const research = { valid: true, sources: [{ url: "https://example.com/1", excerpt: "fact" }, { url: "https://example.com/2", excerpt: "fact" }, { url: "https://example.com/3", excerpt: "fact" }] };
const valid = {
  title: "Why This Trend Is Suddenly Everywhere",
  displayTitle: "Why This Trend Is Suddenly Everywhere",
  description: "A useful explanation of a current internet moment.",
  category: "culture",
  categoryConfidence: 0.8,
  articleType: "explainer",
  tags: ["Internet Culture", "Media"],
  bodyMarkdown: Array.from({ length: 800 }, () => "context").join(" "),
  seoTitle: "Why This Trend Is Suddenly Everywhere",
  seoDescription: "A concise explanation of the trend and why it matters.",
};

test("accepts a complete low-risk draft with research", () => {
  assert.equal(validateGeneratedArticle(valid, research).valid, true);
});

test("requires a concise display title and keeps full titles bounded", () => {
  assert.equal(validateHeadlineQuality({ title: "A full editorial headline", displayTitle: "A full editorial headline" }).valid, true);
  assert.equal(validateHeadlineQuality({ title: "A very long full editorial headline that explains the context and keeps going beyond the card limit", displayTitle: "A very long full editorial headline that explains the context and keeps going beyond the card limit" }).valid, false);
  assert.ok(validateGeneratedArticle({ ...valid, displayTitle: "" }, research).errors.includes("displayTitle is required"));
});

test("repairs a generic display headline without truncating a word", () => {
  assert.equal(repairDisplayTitle("Why people are suddenly collecting tiny cameras: What it means for culture", "Why people are suddenly collecting tiny cameras: What it means for culture"), "Why people are suddenly collecting tiny cameras");
  assert.equal(validateHeadlineQuality({ title: "What it means for culture", displayTitle: "What it means for culture" }).valid, false);
});

test("rejects incomplete generation and missing research", () => {
  const result = validateGeneratedArticle({ ...valid, bodyMarkdown: "short" }, { sources: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("word count")));
  assert.ok(result.errors.some((error) => error.includes("valid research")));
});

test("marks sensitive topics for review instead of allowing unattended publication", () => {
  const result = validateGeneratedArticle({ ...valid, title: "A legal advice guide" }, research);
  assert.equal(result.valid, false);
  assert.equal(result.needsReview, true);
});

test("allows optional contextual polls only with two to four unique options", () => {
  assert.equal(validateGeneratedArticle({ ...valid, contextualPoll: { question: "Would you try it?", options: ["Yes", "No"] } }, research).valid, true);
  assert.equal(validateGeneratedArticle({ ...valid, contextualPoll: { question: "Would you try it?", options: ["Yes"] } }, research).valid, false);
});

test("classifies podcast media stories as culture, not sex-health", () => {
  const result = classifyEditorialCategory({ title: "Gen Z podcast listening surpasses TikTok for advertisers", summary: "A media and advertising story" });
  assert.equal(result.category, "culture");
  assert.ok(result.categoryConfidence >= 0.55);
});

test("candidate category does not override the primary subject", () => {
  assert.equal(classifyEditorialCategory({ title: "Gen Z podcast listening surpasses TikTok", category: "sex-health" }).category, "culture");
});

test("normalizes duplicate and meaningless tags", () => {
  assert.deepEqual(normalizeArticleTags(["culture", "Internet culture", "PODCAST", "podcasts", "life"]), ["Internet Culture", "Podcasts"]);
});

test("flags repeated heading structures", () => {
  const article = { bodyMarkdown: "## Why now\nText\n## What matters\nText" };
  assert.equal(detectStructuralRepetition(article, [article]).repeated, true);
});

test("blocks unsupported statistics", () => {
  const result = validateGeneratedArticle({ ...valid, bodyMarkdown: `${valid.bodyMarkdown} The number rose by 999%.` }, { valid: true, sources: [{ url: "https://example.com", excerpt: "No percentage reported" }, { url: "https://example.com/2", excerpt: "No percentage reported" }, { url: "https://example.com/3", excerpt: "No percentage reported" }] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("unsupported statistic")));
});
