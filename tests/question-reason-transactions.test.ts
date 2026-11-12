import test from "node:test";
import assert from "node:assert/strict";
import { reasonDocumentId, quotaDocumentId, recordQuestionReason, type ReasonTransactionDependencies } from "../lib/question-reason-transaction-core.ts";
class Missing extends Error { code = 404; }
class Conflict extends Error { code = 409; }
function harness(seed = 0) { const docs = new Map<string, Record<string, unknown>>(); const calls: string[] = []; let next = 0; const deps: ReasonTransactionDependencies = { databaseId: "db", reasonsCollectionId: "reasons", quotasCollectionId: "quotas", dailyLimit: 5, createTransaction: async () => ({ $id: `tx-${++next}` }), getDocument: async (_d, c, id) => { const value = docs.get(`${c}:${id}`); if (!value) throw new Missing(); return value; }, createDocument: async (_d, c, id, data) => { calls.push(`create:${c}:${id}`); if (docs.has(`${c}:${id}`)) throw new Conflict(); docs.set(`${c}:${id}`, data); }, updateDocument: async (_d, c, id, data) => { calls.push(`update:${c}:${id}`); docs.set(`${c}:${id}`, { ...docs.get(`${c}:${id}`), ...data }); }, updateTransaction: async (_id, commit, rollback) => { calls.push(commit ? "commit" : rollback ? "rollback" : "close"); }, isNotFound: (e) => e instanceof Missing, isConflict: (e) => e instanceof Conflict }; if (seed) docs.set(`quotas:${quotaDocumentId("visitor", "2026-09-30")}`, { count: seed, day: "2026-09-30" }); return { deps, docs, calls }; }
const input = (pollId = "poll-a") => ({ pollId, questionSlug: "question", optionId: "yes", reason: "Because", visitorHash: "visitor", day: "2026-09-30" });
test("first reason creates pending reason and quota at one atomically", async () => { const h = harness(); assert.deepEqual(await recordQuestionReason(input(), h.deps), { status: "recorded" }); assert.equal(h.docs.get(`quotas:${quotaDocumentId("visitor", "2026-09-30")}`)?.count, 1); assert.ok([...h.docs.values()].some((doc) => doc.status === "pending")); assert.ok(h.calls.includes("commit")); });
test("same visitor and poll is duplicate without a second reason", async () => { const h = harness(); await recordQuestionReason(input(), h.deps); assert.deepEqual(await recordQuestionReason(input(), h.deps), { status: "duplicate" }); assert.equal([...h.docs.values()].filter((doc) => doc.status === "pending").length, 1); });
test("sixth daily reason is rate limited", async () => { const h = harness(5); assert.deepEqual(await recordQuestionReason(input("poll-six"), h.deps), { status: "rate_limited" }); assert.equal([...h.docs.values()].filter((doc) => doc.status === "pending").length, 0); });
test("reason and quota IDs are deterministic and one-way shaped", () => { assert.equal(reasonDocumentId("visitor", "poll-a"), reasonDocumentId("visitor", "poll-a")); assert.notEqual(reasonDocumentId("visitor", "poll-a"), "visitor"); assert.equal(quotaDocumentId("visitor", "2026-09-30"), quotaDocumentId("visitor", "2026-09-30")); });
test("transaction conflict retries and re-reads a full quota", async () => {
  const h = harness(4); let attempt = 0;
  const originalCreate = h.deps.createDocument;
  h.deps.createDocument = async (...args) => { if (++attempt === 1) throw new Conflict(); return originalCreate(...args); };
  assert.deepEqual(await recordQuestionReason(input("poll-race"), h.deps), { status: "recorded" });
  assert.equal(h.docs.get(`quotas:${quotaDocumentId("visitor", "2026-09-30")}`)?.count, 5);
});
test("quota failure returns failure and does not report success", async () => {
  const h = harness(); let creates = 0;
  const originalCreate = h.deps.createDocument;
  h.deps.createDocument = async (...args) => { if (++creates === 2) throw new Error("quota write failed"); return originalCreate(...args); };
  assert.equal((await recordQuestionReason(input("poll-failure"), h.deps)), null);
  assert.ok(h.calls.includes("rollback"));
});
