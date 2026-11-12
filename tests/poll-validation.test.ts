import test from "node:test";
import assert from "node:assert/strict";
import { isValidPollOption, shouldRecordPollVote } from "../lib/poll-validation.ts";

const options = ["Yes", "No"];

test("accepts an option that's in the poll's option list", () => {
  assert.equal(isValidPollOption(options, "Yes"), true);
});

test("rejects an option not in the poll's option list", () => {
  assert.equal(isValidPollOption(options, "Maybe"), false);
});

test("rejects non-string option payloads", () => {
  assert.equal(isValidPollOption(options, 1), false);
  assert.equal(isValidPollOption(options, null), false);
  assert.equal(isValidPollOption(options, undefined), false);
});

test("records a vote when the visitor has no existing ballot", () => {
  assert.equal(shouldRecordPollVote(null), true);
});

test("does not record a duplicate vote when a ballot already exists", () => {
  assert.equal(shouldRecordPollVote("Yes"), false);
});
