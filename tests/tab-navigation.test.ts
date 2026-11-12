import test from "node:test";
import assert from "node:assert/strict";
import { wrapTabIndex } from "../lib/tab-navigation.ts";

test("keeps an in-range index unchanged", () => {
  assert.equal(wrapTabIndex(1, 3), 1);
});

test("wraps forward past the last tab back to the first", () => {
  assert.equal(wrapTabIndex(3, 3), 0);
});

test("wraps backward past the first tab to the last", () => {
  assert.equal(wrapTabIndex(-1, 3), 2);
});

test("handles an empty tab list without dividing by zero", () => {
  assert.equal(wrapTabIndex(0, 0), 0);
});
