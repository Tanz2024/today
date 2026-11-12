import test from "node:test";
import assert from "node:assert/strict";
import { filterMetroPicks } from "../lib/metro-picks-filter.ts";

const picks = [
  { city: "kuala-lumpur", id: "a" },
  { city: "kuala-lumpur", id: "b" },
  { city: "singapore", id: "c" },
];

test("filters to only the requested city", () => {
  const result = filterMetroPicks(picks, "kuala-lumpur", 10);
  assert.deepEqual(result.map((p) => p.id), ["a", "b"]);
});

test("respects the limit", () => {
  const result = filterMetroPicks(picks, "kuala-lumpur", 1);
  assert.deepEqual(result.map((p) => p.id), ["a"]);
});

test("returns an empty array when nothing matches (no fake fallback)", () => {
  assert.deepEqual(filterMetroPicks(picks, "tokyo", 10), []);
});

test("returns an empty array for an empty source list", () => {
  assert.deepEqual(filterMetroPicks([], "kuala-lumpur", 10), []);
});
