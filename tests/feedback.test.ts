import test from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_FALLBACK_URL, getFeedbackUrl } from "../lib/feedback.ts";

test("feedback integration has a safe local fallback", () => {
  assert.equal(getFeedbackUrl(), FEEDBACK_FALLBACK_URL);
});
