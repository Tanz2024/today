import test from "node:test";
import assert from "node:assert/strict";
import { MOOD_OPTIONS, isMoodTag } from "../lib/mood-options.ts";

test("MOOD_OPTIONS has exactly the six required moods", () => {
  const values = MOOD_OPTIONS.map((option) => option.value).sort();
  assert.deepEqual(values, ["bored", "broke", "going-out", "need-advice", "need-music", "overthinking"].sort());
});

test("isMoodTag accepts only known mood values", () => {
  assert.equal(isMoodTag("bored"), true);
  assert.equal(isMoodTag("overthinking"), true);
  assert.equal(isMoodTag("sad"), false);
  assert.equal(isMoodTag(""), false);
  assert.equal(isMoodTag(undefined), false);
  assert.equal(isMoodTag(123), false);
});
