import test from "node:test";
import assert from "node:assert/strict";
import { createExecutionBudget } from "../lib/execution-budget.mjs";

test("execution budget reports exhaustion and logs it once", () => {
  let now = 0;
  const events: unknown[] = [];
  const budget = createExecutionBudget({ maxMs: 240, safeRemainingMs: 40, now: () => now, onExhausted: (event) => events.push(event) });
  assert.equal(budget.canStart(100), true);
  now = 210;
  assert.equal(budget.canStart(40), false);
  assert.equal(budget.checkpoint("next-unit"), false);
  assert.equal(budget.checkpoint("another-unit"), false);
  assert.equal(events.length, 1);
});

test("budget cannot start new work after exhaustion", () => {
  let now = 0;
  const budget = createExecutionBudget({ maxMs: 100, safeRemainingMs: 10, now: () => now });
  now = 95;
  assert.equal(budget.exhausted(), true);
  assert.equal(budget.canStart(1), false);
});
