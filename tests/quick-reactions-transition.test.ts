import test from "node:test";
import assert from "node:assert/strict";
import { resolveQuickReactionTransition } from "../lib/quick-reactions-transition.ts";

test("first reaction from a visitor increments only, nothing to replace", () => {
  const result = resolveQuickReactionTransition<string>(null, "helpful");
  assert.deepEqual(result, { kind: "first", increment: "helpful" });
});

test("picking a different reaction replaces the previous one", () => {
  const result = resolveQuickReactionTransition("helpful", "relatable");
  assert.deepEqual(result, { kind: "replace", decrement: "helpful", increment: "relatable" });
});

test("picking the same reaction again is a no-op", () => {
  const result = resolveQuickReactionTransition("relatable", "relatable");
  assert.deepEqual(result, { kind: "noop" });
});
