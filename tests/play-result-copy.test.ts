import test from "node:test";
import assert from "node:assert/strict";
import { breakerResultCopy, obbyResultCopy, rushResultCopy } from "../lib/play/result-copy.ts";

test("breaker: new best, so close, far off, first game and cleared", () => {
  assert.equal(breakerResultCopy({ score: 900, board: 4, previousBest: 800, isNewBest: true, cleared: false }).status, "New best");
  const close = breakerResultCopy({ score: 780, board: 3, previousBest: 800, isNewBest: false, cleared: false });
  assert.equal(close.status, "So close");
  assert.equal(close.progress, "20 points to your best");
  const far = breakerResultCopy({ score: 100, board: 1, previousBest: 800, isNewBest: false, cleared: false });
  assert.equal(far.status, "Board 1");
  assert.equal(far.progress, "700 points to your best");
  assert.equal(breakerResultCopy({ score: 70, board: 1, previousBest: 0, isNewBest: false, cleared: false }).progress, "First score on the board");
  assert.equal(breakerResultCopy({ score: 400, board: 2, previousBest: 0, isNewBest: false, cleared: true }).status, "Board 2 cleared");
});

test("rush: distance copy", () => {
  assert.equal(rushResultCopy({ meters: 642, previousBest: 600, isNewBest: true }).value, "642m");
  assert.equal(rushResultCopy({ meters: 588, previousBest: 600, isNewBest: false }).status, "12m to go");
  assert.equal(rushResultCopy({ meters: 100, previousBest: 600, isNewBest: false }).progress, "500m short of your best");
  assert.equal(rushResultCopy({ meters: 78, previousBest: 0, isNewBest: false }).status, "First run");
});

test("obby: made it, almost there, and fail reasons", () => {
  const base = { level: 2, seconds: 31.24, stories: 4, totalStories: 9, isNewBest: false };
  assert.equal(obbyResultCopy({ ...base, complete: true, progress: 100, reason: null }).status, "You made it");
  assert.equal(obbyResultCopy({ ...base, complete: true, progress: 100, reason: null }).caption, "Cleared in 31.2s");
  assert.equal(obbyResultCopy({ ...base, complete: false, progress: 72, reason: "gap" }).status, "Almost there");
  assert.equal(obbyResultCopy({ ...base, complete: false, progress: 20, reason: "hazard" }).status, "Watch your step");
  assert.equal(obbyResultCopy({ ...base, complete: false, progress: 20, reason: "gap" }).value, "20%");
});
