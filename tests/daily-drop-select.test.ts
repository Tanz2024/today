import test from "node:test";
import assert from "node:assert/strict";
import { selectDailyDrop, todayInSiteTimezone } from "../lib/daily-drop-select.ts";

const entries = [
  { date: "2026-09-12" },
  { date: "2026-09-19" },
];

test("todayInSiteTimezone formats as YYYY-MM-DD", () => {
  const result = todayInSiteTimezone(new Date("2026-09-19T02:00:00Z"));
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test("selects the exact entry for today's date", () => {
  const result = selectDailyDrop(entries, "2026-09-19");
  assert.deepEqual(result, { entry: { date: "2026-09-19" }, isLatest: false });
});

test("falls back to the most recent past entry when there is no exact match", () => {
  const result = selectDailyDrop(entries, "2026-09-25");
  assert.deepEqual(result, { entry: { date: "2026-09-19" }, isLatest: true });
});

test("falls back to the earliest entry when today is before every entry", () => {
  const result = selectDailyDrop(entries, "2026-01-01");
  assert.deepEqual(result, { entry: { date: "2026-09-12" }, isLatest: true });
});

test("returns null for an empty entry list", () => {
  assert.equal(selectDailyDrop([], "2026-09-19"), null);
});
