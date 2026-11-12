import test from "node:test";
import assert from "node:assert/strict";
import { dailyEditionContentQueries, dailyInteractiveEditionKey, isCompleteDailyEdition, validateDailyInteractiveEdition } from "../lib/editorial-edition-utils.ts";

const key = "daily-interactive-2026-09-22";
const all = ["pulse", "daily_trivia", "group_chat_question", "this_or_that", "daily_drop"].map((slot, index) => ({ $id: `doc-${index}`, slot, editionKey: key, status: "approved" }));

test("a complete daily edition is accepted", () => assert.equal(isCompleteDailyEdition(all, key), true));
test("manifest cache identity uses the editorial date", () => {
  assert.equal(dailyInteractiveEditionKey("2026-09-22"), key);
  assert.equal(dailyInteractiveEditionKey("2026-09-22"), dailyInteractiveEditionKey("2026-09-22"));
});
test("content queries target the committed edition and slot", () => {
  const queries = dailyEditionContentQueries("pulse", key);
  assert.ok(queries.some((query) => query.includes('"attribute":"slot"') && query.includes('"pulse"')));
  assert.ok(queries.some((query) => query.includes('"attribute":"editionKey"') && query.includes(key)));
  assert.ok(queries.some((query) => query.includes('"method":"limit"')));
});
test("one missing slot is rejected with diagnostics", () => {
  const result = validateDailyInteractiveEdition(all.slice(0, 4), key);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missingSlots, ["daily_drop"]);
});
test("duplicate slots are rejected with document IDs", () => {
  const result = validateDailyInteractiveEdition([...all, { $id: "duplicate", slot: "pulse", editionKey: key, status: "approved" }], key);
  assert.equal(result.valid, false);
  assert.deepEqual(result.duplicateSlots, ["pulse"]);
  assert.ok(result.documentIds.includes("duplicate"));
});
test("wrong edition keys are rejected", () => {
  const result = validateDailyInteractiveEdition(all.map((item, index) => index === 0 ? { ...item, editionKey: "other" } : item), key);
  assert.equal(result.valid, false);
  assert.deepEqual(result.wrongEditionKeyDocumentIds, ["doc-0"]);
});
test("invalid statuses are rejected", () => {
  const result = validateDailyInteractiveEdition(all.map((item, index) => index === 0 ? { ...item, status: "candidate" } : item), key);
  assert.equal(result.valid, false);
  assert.deepEqual(result.invalidStatusDocumentIds, ["doc-0"]);
});
