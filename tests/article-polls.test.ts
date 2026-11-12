import test from "node:test";
import assert from "node:assert/strict";
import { createContextualPoll, validateContextualPoll } from "../lib/article-polls.ts";

test("missing or malformed article polls are ignored", () => {
  assert.equal(createContextualPoll("story", undefined), null);
  assert.equal(validateContextualPoll({ question: "Only one", options: ["A"] }), false);
  assert.equal(validateContextualPoll({ question: "Duplicate", options: ["A", "a"] }), false);
});

test("article polls support two through four options", () => {
  for (const count of [2, 3, 4]) {
    const poll = createContextualPoll("story", { question: "What now?", options: Array.from({ length: count }, (_, i) => `Choice ${i + 1}`) });
    assert.ok(poll);
    assert.equal(poll.options.length, count);
    assert.equal(Object.keys(poll.optionLabels).length, count);
  }
});

test("poll and option IDs are stable, while material changes version the poll", () => {
  const input = { question: "Ask for clarity?", options: ["Yes", "No"] };
  const first = createContextualPoll("what-is-a-situationship", input);
  const second = createContextualPoll("what-is-a-situationship", input);
  const changed = createContextualPoll("what-is-a-situationship", { ...input, options: ["Ask", "Avoid"] });
  assert.ok(first && second && changed);
  assert.equal(first.id, second.id);
  assert.deepEqual(first.options, second.options);
  assert.notEqual(first.id, changed.id);
  assert.match(first.id, /^article-what-is-a-situationship-contextual-v1-/);
});
