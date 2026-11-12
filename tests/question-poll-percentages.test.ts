import test from "node:test";
import assert from "node:assert/strict";
import { allocatePercentages } from "../lib/question-poll-percentages.ts";

for (const [counts, expected] of [[[1, 1, 1], [34, 33, 33]], [[2, 1, 0], [67, 33, 0]], [[10, 10, 10], [34, 33, 33]], [[1, 2, 4], [14, 29, 57]], [[100, 0, 0], [100, 0, 0]], [[0, 0, 0], [0, 0, 0]]] as const) {
  test(`allocates percentages for ${counts.join("/")}`, () => assert.deepEqual(allocatePercentages([...counts]), expected));
}
