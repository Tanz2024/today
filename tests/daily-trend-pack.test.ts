import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyTrendPack, normalizeTrendText, questionIsDuplicate, similarity } from "../lib/daily-trend-pack.mjs";

test("trend pack isolates providers and removes duplicate stories", () => {
  const pack = buildDailyTrendPack([
    { source: "tavily", status: "success", items: [{ title: "Gen Alpha returns to Roblox", url: "https://example.com/a?utm=1", summary: "A youth gaming trend" }] },
    { source: "the-news-api", status: "failed", items: [], reason: "timeout" },
  ]);
  assert.equal(pack.trends.length, 1);
  assert.equal(pack.providers["the-news-api"].status, "failed");
  assert.match(pack.trends[0].trendId, /^trend-/);
});

test("question duplicate detection catches rewritten questions", () => {
  assert.equal(questionIsDuplicate("Are you usually the first one to text?", ["Would you text first?"]), true);
  assert.equal(questionIsDuplicate("Which snack belongs in a movie night?", ["Would you text first?"]), false);
});

test("trend normalization and similarity are deterministic", () => {
  assert.equal(normalizeTrendText("Why Gen Alpha's Roblox moment?"), "why gen alpha s roblox moment");
  assert.ok(similarity("Gen Alpha Roblox trend", "Roblox trend for Gen Alpha") > 0.5);
});

test("irrelevant commercial press releases are excluded", () => {
  const pack = buildDailyTrendPack([{ source: "tavily", status: "success", items: [
    { title: "Gen Z dating app fatigue is rising", url: "https://example.com/relevant", summary: "Young adults are changing how they date." },
    { title: "Attorney launches award-winning product", url: "https://example.com/noise", summary: "A press release about an attorney and awards." },
  ] }]);
  assert.deepEqual(pack.trends.map((item) => item.title), ["Gen Z dating app fatigue is rising"]);
});
