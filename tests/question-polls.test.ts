import test from "node:test";
import assert from "node:assert/strict";
import { getQuestionPoll } from "../lib/question-polls.ts";

test("double-text has the explicit three-option question poll", () => {
  const poll = getQuestionPoll("should-i-double-text");
  assert.deepEqual(poll?.options, ["text-again", "wait", "leave-it"]);
  assert.deepEqual(poll?.optionLabels, { "text-again": "Text again", wait: "Wait", "leave-it": "Leave it" });
});

test("questions without an opted-in poll remain unchanged", () => {
  assert.equal(getQuestionPoll("why-do-i-feel-lonely-even-with-friends"), undefined);
});
