import assert from "node:assert/strict";
import test from "node:test";
import { FOCUS_DURATIONS, secondsLeft } from "../lib/tools/focus-timer.ts";
import { COMPATIBILITY_QUESTIONS, compatibilityLabel, compatibilityScores, similarity } from "../lib/tools/compatibility.ts";

test("focus timer defaults and timestamp math stay finite", () => { assert.equal(FOCUS_DURATIONS.focus, 1500); assert.equal(FOCUS_DURATIONS.short, 300); assert.equal(FOCUS_DURATIONS.long, 900); assert.equal(secondsLeft(10_000, 10_000), 0); assert.equal(secondsLeft(11_001, 10_000), 2); assert.equal(secondsLeft(9_000, 10_000), 0); });
test("compatibility scoring is deterministic and bounded", () => { const same = Array(COMPATIBILITY_QUESTIONS.length).fill(3); const different = Array(COMPATIBILITY_QUESTIONS.length).fill(1); const reverse = Array(COMPATIBILITY_QUESTIONS.length).fill(5); assert.equal(similarity(3, 3), 100); assert.equal(similarity(1, 5), 0); assert.equal(compatibilityScores(same, same).overall, 100); assert.equal(compatibilityScores(different, reverse).overall, 0); for (const value of Object.values(compatibilityScores(same, reverse).dimensions)) assert.ok(Number.isFinite(value) && value >= 0 && value <= 100); });
test("compatibility labels use documented boundaries", () => { assert.equal(compatibilityLabel(85), "Very aligned"); assert.equal(compatibilityLabel(70), "Mostly aligned"); assert.equal(compatibilityLabel(50), "Mixed styles"); assert.equal(compatibilityLabel(49), "Different styles"); });
