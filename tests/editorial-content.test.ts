import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isValidStatusTransition, isValidTypeSlot, nowInEditorialTimezone, validateEditorialPayload } from "../lib/editorial-content-config.ts";
import { getNextMalaysiaMondayBoundary } from "../lib/editorial-weekly-runner.mjs";
import { buildProviderEditorNote, normalizeCandidates } from "../lib/editorial-providers.mjs";
import { existingEditorialNote, toEditorialDocument } from "../lib/editorial-weekly-runner.mjs";

test("provider notes are factual, stable and source-grounded", () => {
  assert.equal(buildProviderEditorNote({ source: "tmdb", type: "movie", sourceRank: 1 }), "A movie surfaced by TMDB's global trend data, ranked #1.");
  assert.equal(buildProviderEditorNote({ source: "tmdb", type: "tv", sourceRank: 2 }), "A television title surfaced by TMDB's global trend data, ranked #2.");
  assert.equal(buildProviderEditorNote({ source: "anilist", type: "anime", sourceRank: 3 }), "An anime title surfaced by AniList's trend data, ranked #3.");
  assert.equal(buildProviderEditorNote({ source: "tmdb", type: "movie" }), "A movie surfaced by TMDB's global trend data.");
  assert.equal(buildProviderEditorNote({ source: "unknown", type: "movie" }), undefined);
});

test("provider normalization adds notes without inventing metadata", () => {
  const [movie, tv, anime] = normalizeCandidates([[
    { source: "tmdb", externalId: "m", type: "movie", title: "Movie", sourceRank: 1 },
    { source: "tmdb", externalId: "t", type: "tv", title: "Series", sourceRank: 2 },
    { source: "anilist", externalId: "a", type: "anime", title: "Anime", sourceRank: 3 },
  ]]);
  assert.match(movie.editorNote, /TMDB/);
  assert.match(tv.editorNote, /television/);
  assert.match(anime.editorNote, /AniList/);
  assert.doesNotMatch(`${movie.editorNote} ${tv.editorNote} ${anime.editorNote}`, /review|I |my |watched|airing|this week/i);
});

test("existing editorial notes survive Appwrite document normalization", () => {
  const item = { type: "movie", slot: "on_screen_movie", source: "tmdb", externalId: "1", title: "Movie", editorNote: "Provider note" };
  const document = toEditorialDocument(item, "published", "Approved editorial note");
  assert.equal(document.editorNote, "Approved editorial note");
  assert.equal(JSON.parse(String(document.payload)).editorNote, "Approved editorial note");
  assert.equal(existingEditorialNote({ payload: JSON.stringify({ editorNote: "Stored editorial note" }) }), "Stored editorial note");
});

test("local on-screen fallback retains curated notes", async () => {
  const fallback = JSON.parse(fs.readFileSync("content/on-screen.json", "utf8")) as { items: Array<Record<string, unknown>> };
  const items = fallback.items.filter((item) => item.section === "Movies");
  assert.ok(items.length > 0);
  assert.match(String(items[0].editorNote), /TMDB|movie trend/i);
});

test("editorial status transitions are constrained", () => {
  assert.equal(isValidStatusTransition("candidate", "approved"), true);
  assert.equal(isValidStatusTransition("published", "candidate"), false);
  assert.equal(isValidStatusTransition("scheduled", "published"), true);
});

test("editorial type and slot combinations are validated", () => {
  assert.equal(isValidTypeSlot("music", "on_repeat_music"), true);
  assert.equal(isValidTypeSlot("movie", "on_screen_tv"), false);
  assert.equal(isValidTypeSlot("unknown", "daily_drop"), false);
});

test("editorial timezone helper uses Malaysia date and time", () => {
  assert.match(nowInEditorialTimezone(new Date("2026-01-01T16:00:00.000Z")), /^2026-01-02T00:00:00$/);
});

test("migration dry-run preserves grouped editions and source order", () => {
  const output = execFileSync(process.execPath, [path.join(process.cwd(), "scripts/migrate-editorial.mjs"), "--dry-run"], { encoding: "utf8" });
  const documents = output.split("\n").filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, unknown>);
  const music = documents.filter((item) => item.slot === "on_repeat_music");
  assert.equal(music.length, 5);
  const editions = new Map<string, number[]>();
  for (const item of music) {
    const editionKey = String(item.editionKey);
    editions.set(editionKey, [...(editions.get(editionKey) ?? []), Number(item.displayOrder)]);
  }
  assert.deepEqual([...editions.values()], [[1, 2, 3, 4, 5]]);
});

test("migration dry-run keeps three items in each current on-screen group", () => {
  const output = execFileSync(process.execPath, [path.join(process.cwd(), "scripts/migrate-editorial.mjs"), "--dry-run"], { encoding: "utf8" });
  const documents = output.split("\n").filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, unknown>);
  for (const slot of ["on_screen_movie", "on_screen_anime", "on_screen_tv"]) {
    const items = documents.filter((item) => item.slot === slot);
    assert.equal(items.length, 3);
    assert.deepEqual(items.map((item) => item.displayOrder), [1, 2, 3]);
    assert.equal(new Set(items.map((item) => item.editionKey)).size, 1);
  }
});

test("migration dry-run preserves poll IDs for legacy lookup", () => {
  const output = execFileSync(process.execPath, [path.join(process.cwd(), "scripts/migrate-editorial.mjs"), "--dry-run"], { encoding: "utf8" });
  const documents = output.split("\n").filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.deepEqual(documents.filter((item) => item.type === "poll").map((item) => item.externalId), ["double-text", "travel-alone", "music-platform"]);
});

test("recurring Play payloads are validated by type", () => {
  assert.deepEqual(validateEditorialPayload("trivia", { question: "Q", options: ["A", "B"], correctAnswer: "A", explanation: "Because." }), []);
  assert.ok(validateEditorialPayload("trivia", { question: "Q", options: ["A"] }).some((error) => error.includes("trivia payload")));
  assert.deepEqual(validateEditorialPayload("group_chat_question", { question: "Q" }), []);
  assert.deepEqual(validateEditorialPayload("this_or_that", { left: "Go out", right: "Stay home" }), []);
});

test("weekly boundaries use Monday midnight in Malaysia", () => {
  assert.deepEqual(getNextMalaysiaMondayBoundary(new Date("2026-09-20T08:00:00Z")), { dateKey: "2026-09-21", publishAt: "2026-09-20T16:00:00.000Z", expireAt: "2026-09-27T16:00:00.000Z" });
  assert.equal(getNextMalaysiaMondayBoundary(new Date("2026-12-27T08:00:00Z")).dateKey, "2026-12-28");
  assert.equal(getNextMalaysiaMondayBoundary(new Date("2026-12-31T08:00:00Z")).dateKey, "2027-01-04");
});
