import test from "node:test";
import assert from "node:assert/strict";
import { budgetSummary, cumulativeCgpa, requiredExamScore, targetGpa, tripSummary, weightedGpa } from "../lib/tools/calculations.ts";

test("budget summary handles surplus, rates and goal timeline", () => {
  const result = budgetSummary(3000, { rent: 1000, food: 500, social: 200 }, 300, 1200, 0);
  assert.equal(result.surplus, 1300); assert.equal(result.monthsToGoal, 4); assert.equal(Math.round(result.savingsRate), 10);
});
test("budget summary reports deficits and no zero-saving timeline", () => { const result = budgetSummary(100, { other: 200 }, 0, 500, 0); assert.equal(result.surplus, -100); assert.equal(result.monthsToGoal, null); });
test("weighted GPA and cumulative CGPA are credit weighted", () => { assert.equal(weightedGpa([{ credits: 3, points: 4 }, { credits: 1, points: 2 }]), 3.5); assert.equal(cumulativeCgpa(3, 60, 4, 15), 3.2); });
test("target GPA identifies impossible targets", () => { assert.equal(targetGpa(2, 60, 4, 15).status, "impossible"); assert.equal(targetGpa(3.5, 60, 3.5, 15).required, 3.5); });
test("final exam score calculates possibility and maximum", () => { const result = requiredExamScore(60, 40, 70); assert.equal(result.required, 85); assert.equal(result.possible, true); assert.equal(result.highest, 76); });
test("trip summary includes per-person food and totals", () => { const result = tripSummary({ travelers: 2, days: 3, transport: 200, accommodation: 300, foodPerPersonPerDay: 50, localTransportPerDay: 20, activities: 100, shopping: 0, insurance: 0, emergency: 0 }); assert.equal(result.total, 960); assert.equal(result.perTraveler, 480); });
