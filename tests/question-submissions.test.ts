import test from "node:test";
import assert from "node:assert/strict";
import { validateQuestionText, MAX_QUESTION_LENGTH, MAX_SUBMISSIONS_PER_DAY } from "../lib/question-validation.ts";

test("accepts a normal-length question", () => {
  assert.equal(validateQuestionText("Is it normal to still think about my ex?"), true);
});

test("rejects an empty or whitespace-only question", () => {
  assert.equal(validateQuestionText(""), false);
  assert.equal(validateQuestionText("   "), false);
});

test("rejects a question over the character limit", () => {
  assert.equal(validateQuestionText("a".repeat(MAX_QUESTION_LENGTH + 1)), false);
});

test("accepts a question exactly at the character limit", () => {
  assert.equal(validateQuestionText("a".repeat(MAX_QUESTION_LENGTH)), true);
});

test("rejects non-string input", () => {
  assert.equal(validateQuestionText(123), false);
  assert.equal(validateQuestionText(undefined), false);
  assert.equal(validateQuestionText(null), false);
});

test("rate limit constant matches spec (3 per day)", () => {
  assert.equal(MAX_SUBMISSIONS_PER_DAY, 3);
});
