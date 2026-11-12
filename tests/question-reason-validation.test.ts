import test from "node:test";
import assert from "node:assert/strict";
import { MAX_REASON_LENGTH, validateQuestionReason } from "../lib/question-reason-validation.ts";

test("question reasons are trimmed and limited to 280 characters", () => {
  assert.deepEqual(validateQuestionReason("  A short reason  "), { ok: true, reason: "A short reason" });
  assert.equal(validateQuestionReason("x".repeat(MAX_REASON_LENGTH + 1)).ok, false);
  assert.equal(validateQuestionReason("   ").ok, false);
});

test("question reasons reject links and contact details", () => {
  assert.equal(validateQuestionReason("https://example.com").ok, false);
  assert.equal(validateQuestionReason("hello@example.com").ok, false);
  assert.equal(validateQuestionReason("Call me at +1 555 123 4567").ok, false);
});
