import test from "node:test";
import assert from "node:assert/strict";
import { addToCollection, gameStorageKey, readCollection, readGameStats, readLevelBests, recordGameResult, recordLevelBest, recordLevelReached } from "../lib/play/storage.ts";
import { articleMatchesTheme, topTheme } from "../lib/play/themes.ts";
import { createPlaySession, durationBucket, scoreBucket } from "../lib/play/analytics.ts";
import type { AnalyticsMetadata, HomepageEventName } from "../lib/homepage-analytics.ts";
import { pickPlayArticle, pickPlayArticles, type PlayArticle } from "../lib/play/recommendation.ts";

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, data };
}

test("personal bests only go up", () => {
  const store = storage();
  assert.equal(recordGameResult(store, "rush", { score: 400, distance: 900 }).isNewBest, true);
  const second = recordGameResult(store, "rush", { score: 120, distance: 300 });
  assert.equal(second.isNewBest, false);
  assert.deepEqual(second.stats, { gamesPlayed: 2, bestScore: 400, highestLevel: 0, bestDistance: 900, bestCount: 0 });
});

test("level progress is kept without a finished run", () => {
  const store = storage();
  recordLevelReached(store, "obby", 3);
  recordLevelReached(store, "obby", 2);
  assert.equal(readGameStats(store, "obby").highestLevel, 3);
});

test("corrupted or foreign storage falls back to empty stats", () => {
  for (const raw of ["{not json", "null", "[1,2]", JSON.stringify({ bestScore: "9999", gamesPlayed: -4 })]) {
    const stats = readGameStats(storage({ [gameStorageKey("breaker")]: raw }), "breaker");
    assert.equal(stats.bestScore, 0);
    assert.equal(stats.gamesPlayed, 0);
  }
  assert.equal(readGameStats(null, "breaker").bestScore, 0);
});

test("storage keys use the existing play namespace", () => {
  assert.equal(gameStorageKey("obby"), "freshscene:play:obby");
});

test("storage failures never throw", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
  assert.doesNotThrow(() => recordGameResult(broken, "rush", { score: 10 }));
});

test("duration and score buckets", () => {
  assert.equal(durationBucket(5_000), "<30s");
  assert.equal(durationBucket(45_000), "30-60s");
  assert.equal(durationBucket(120_000), "1-3m");
  assert.equal(durationBucket(400_000), "3m+");
  assert.equal(scoreBucket(0), "0");
  assert.equal(scoreBucket(4820), "2000+");
});

test("play session de-duplicates impressions and first actions", () => {
  const events: string[] = [];
  let clock = 0;
  const session = createPlaySession("breaker", (event) => events.push(event), () => clock);
  session.impression(); session.impression();
  session.firstAction(); // before start: ignored
  session.start(); session.firstAction(); session.firstAction();
  session.articleImpression(["a", "b", "c"]); session.articleImpression(["a"]);
  clock = 40_000;
  session.fail({ score_bucket: "1-99" });
  session.start(); session.firstAction();
  assert.deepEqual(events, [
    "game_impression", "game_start", "game_first_action", "game_article_impression", "game_fail", "game_start", "game_first_action",
  ]);
});

test("play session records meaningful progress events without frame noise", () => {
  const events: Array<[string, Record<string, unknown> | undefined]> = [];
  const session = createPlaySession("obby", ((event: HomepageEventName, metadata?: AnalyticsMetadata) => events.push([event, metadata])));
  session.start();
  session.checkpoint(2);
  session.checkpoint(2);
  session.milestone(500);
  assert.deepEqual(events.map(([event]) => event), ["game_start", "game_checkpoint", "game_checkpoint", "game_milestone"]);
  assert.equal(events[1][1]?.checkpoint, 2);
  assert.equal(events[3][1]?.distance, 500);
});

test("run events carry the game type and a duration bucket", () => {
  const sent: Array<Record<string, unknown> | undefined> = [];
  let clock = 1000;
  const session = createPlaySession("obby", (_event, data) => sent.push(data), () => clock);
  session.start();
  clock += 70_000;
  session.complete({ level: 2 });
  assert.deepEqual(sent.at(-1), { game_type: "obby", duration_bucket: "1-3m", level: 2 });
});

const now = new Date().toISOString();
const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
const article = (slug: string, extra: Partial<PlayArticle> = {}): PlayArticle => ({
  slug, category: "culture", title: slug, description: "", tags: [], date: old, readingTime: "3 min read", ...extra,
});

test("recommendation returns null with no candidates", () => {
  assert.equal(pickPlayArticle([]), null);
});

test("cold start shows the strongest trending story, then the freshest", () => {
  const candidates = [article("fresh", { date: now }), article("trending", { trendingIndex: 0 })];
  assert.equal(pickPlayArticle(candidates)?.slug, "trending");
  assert.equal(pickPlayArticle([article("older"), article("fresh", { date: now })])?.slug, "fresh");
});

test("recommendation skips stories the reader has already read", () => {
  const candidates = [article("read-one", { trendingIndex: 0 }), article("unread")];
  assert.equal(pickPlayArticle(candidates, { recentlyRead: ["read-one"] })?.slug, "unread");
});

test("if everything is read it still recommends something", () => {
  assert.equal(pickPlayArticle([article("only")], { recentlyRead: ["only"] })?.slug, "only");
});

test("selected interests steer the pick", () => {
  const candidates = [article("culture-story", { trendingIndex: 0 }), article("money-story", { category: "money", tags: ["Money"] })];
  assert.equal(pickPlayArticle(candidates, { interests: ["Money"] })?.slug, "money-story");
});

test("recent reading topics steer the pick", () => {
  const candidates = [
    article("read-a", { category: "travel", tags: ["Travel"] }), article("read-b", { category: "travel", tags: ["Travel"] }),
    article("culture-story"), article("travel-story", { category: "travel", tags: ["Travel"] }),
  ];
  assert.equal(pickPlayArticle(candidates, { recentlyRead: ["read-a", "read-b"] })?.slug, "travel-story");
});

test("lifetime points and collected themes add up across games", () => {
  const store = storage();
  addToCollection(store, 120, { cafe: 2, music: 1 });
  const collection = addToCollection(store, 30, { cafe: 1 });
  assert.equal(collection.points, 150);
  assert.equal(collection.themes.cafe, 3);
  assert.equal(collection.themes.music, 1);
  assert.equal(readCollection(storage({ "freshscene:play:collection": "{broken" })).points, 0);
});

test("per-level bests only improve", () => {
  const store = storage();
  assert.equal(recordLevelBest(store, "obby", 2, 5).improved, true);
  assert.equal(recordLevelBest(store, "obby", 2, 3).improved, false);
  assert.deepEqual(readLevelBests(store, "obby"), { 2: 5 });
  assert.deepEqual(readLevelBests(storage({ "freshscene:play:obby:levels": "[1]" }), "obby"), {});
});

test("the post-game shelf shows three stories, led by the collected theme", () => {
  const candidates = [
    article("trend-a", { trendingIndex: 0 }), article("trend-b", { trendingIndex: 1 }), article("trend-c", { trendingIndex: 2 }),
    article("coffee", { title: "Why Gen Alpha loves matcha", tags: ["Coffee Culture"] }),
  ];
  const plain = pickPlayArticles(candidates);
  assert.deepEqual(plain.map((item) => item.slug), ["trend-a", "trend-b", "trend-c"]);
  const themed = pickPlayArticles(candidates, { collected: { cafe: 3, music: 1 } });
  assert.equal(themed.length, 3);
  assert.equal(themed[0].slug, "coffee");
});

test("recently offered stories rotate to the back of the shelf", () => {
  const candidates = ["a", "b", "c", "d", "e", "f"].map((slug, index) => article(slug, { trendingIndex: index }));
  const first = pickPlayArticles(candidates).map((item) => item.slug);
  const second = pickPlayArticles(candidates, { recentlyShown: first }).map((item) => item.slug);
  assert.equal(second.filter((slug) => first.includes(slug)).length, 0);
  // Once everything has been offered, the shelf still fills up.
  assert.equal(pickPlayArticles(candidates, { recentlyShown: ["a", "b", "c", "d", "e", "f"] }).length, 3);
});

test("the shelf spreads across desks before repeating one", () => {
  const candidates = [
    article("style-a", { category: "style", trendingIndex: 0 }), article("style-b", { category: "style", trendingIndex: 1 }),
    article("style-c", { category: "style", trendingIndex: 2 }), article("money-a", { category: "money" }), article("travel-a", { category: "travel" }),
  ];
  assert.deepEqual(pickPlayArticles(candidates).map((item) => item.category), ["style", "money", "travel"]);
  assert.equal(pickPlayArticles(candidates.slice(0, 3)).length, 3, "fills from one desk when that is all there is");
});

test("themes match stories by desk or by topic words", () => {
  assert.equal(articleMatchesTheme({ category: "travel", title: "Weekend trips", tags: [] }, "travel"), true);
  assert.equal(articleMatchesTheme({ category: "culture", title: "Why old songs go viral", tags: ["Music"] }, "music"), true);
  assert.equal(articleMatchesTheme({ category: "culture", title: "Aura farming", tags: ["Slang"] }, "music"), false);
  assert.equal(topTheme({ cafe: 1, money: 3 }), "money");
  assert.equal(topTheme({}), null);
});
