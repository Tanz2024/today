import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import { recordPollVoteWithDependencies, type TransactionPoll as Poll, type PollTransactionDependencies } from "../lib/poll-transaction-core.ts";

const poll = { id: "question-should-i-double-text-v1", question: "What would you do?", options: ["text-again", "wait", "leave-it"], active: true } as Poll;
const notFound = () => new AppwriteException("missing", 404);
const failure = (message: string) => new Error(message);

function mockDeps({ ballot, aggregate, fail }: { ballot?: unknown; aggregate?: unknown; fail?: "ballot" | "aggregate-create" | "aggregate-update" | "commit" } = {}) {
  const calls: { transactions: number; reads: Array<[string, string, string]>; creates: unknown[]; updates: unknown[]; commits: number; rollbacks: number } = { transactions: 0, reads: [], creates: [], updates: [], commits: 0, rollbacks: 0 };
  const deps: PollTransactionDependencies = {
    databaseId: "test-db", pollsCollectionId: "poll_votes", ballotsCollectionId: "poll_ballots",
    createTransaction: async () => { calls.transactions += 1; return { $id: "tx-1" }; },
    getDocument: async (_db, collection, id, _queries, tx) => { calls.reads.push([collection, id, tx]); if (collection === "poll_ballots") { if (ballot === undefined) throw notFound(); return ballot; } if (aggregate === undefined) throw notFound(); return aggregate; },
    createDocument: async (_db, collection, _id, data) => { calls.creates.push([collection, data]); if (fail === "ballot" && collection === "poll_ballots") throw failure("ballot failed"); if (fail === "aggregate-create" && collection === "poll_votes") throw failure("aggregate create failed"); return {}; },
    updateDocument: async (_db, collection, _id, data) => { calls.updates.push([collection, data]); if (fail === "aggregate-update") throw failure("aggregate update failed"); return {}; },
    updateTransaction: async (_id, commit, rollback) => { if (commit) { if (fail === "commit") throw failure("commit failed"); calls.commits += 1; } if (rollback) calls.rollbacks += 1; return {}; },
    getPollCounts: async () => ({ "text-again": 0, wait: 0, "leave-it": 0 }),
  };
  return { deps, calls };
}

test("MOCKED UNIT: first vote creates ballot and aggregate with all options", async () => {
  const { deps, calls } = mockDeps();
  const result = await recordPollVoteWithDependencies("visitor-a", poll, "text-again", deps);
  assert.deepEqual(result, { status: "recorded", counts: { "text-again": 1, wait: 0, "leave-it": 0 } });
  assert.equal(calls.transactions, 1); assert.equal(calls.creates.length, 2); assert.equal(calls.commits, 1); assert.equal(calls.rollbacks, 0); assert.equal(calls.reads.every((read) => read[2] === "tx-1"), true);
});

test("MOCKED UNIT: existing aggregate increments only selected option", async () => {
  const { deps, calls } = mockDeps({ aggregate: { counts: JSON.stringify({ "text-again": 5, wait: 3, "leave-it": 2 }) } });
  const result = await recordPollVoteWithDependencies("visitor-a", poll, "wait", deps);
  assert.deepEqual(result?.counts, { "text-again": 5, wait: 4, "leave-it": 2 }); assert.equal(calls.creates.length, 1); assert.equal(calls.updates.length, 1); assert.equal(calls.commits, 1);
});

test("MOCKED UNIT: duplicate voter rolls back without mutation", async () => {
  const { deps, calls } = mockDeps({ ballot: { option: "wait" }, aggregate: { counts: JSON.stringify({ "text-again": 5, wait: 3, "leave-it": 2 }) } });
  const result = await recordPollVoteWithDependencies("visitor-a", poll, "text-again", deps);
  assert.equal(result?.status, "duplicate"); assert.equal(calls.creates.length, 0); assert.equal(calls.updates.length, 0); assert.equal(calls.commits, 0); assert.equal(calls.rollbacks, 1);
});

test("MOCKED UNIT: different visitors are independent for same and different options", async () => {
  const first = mockDeps(); const second = mockDeps();
  assert.equal((await recordPollVoteWithDependencies("a", poll, "text-again", first.deps))?.status, "recorded");
  assert.equal((await recordPollVoteWithDependencies("b", poll, "text-again", second.deps))?.status, "recorded");
  assert.equal((await recordPollVoteWithDependencies("c", poll, "wait", mockDeps().deps))?.status, "recorded");
});

for (const fail of ["ballot", "aggregate-create", "aggregate-update", "commit"] as const) {
  test(`MOCKED UNIT: ${fail} failure does not report success`, async () => {
    const { deps, calls } = mockDeps({ aggregate: fail === "aggregate-update" ? { counts: JSON.stringify({ "text-again": 1, wait: 0, "leave-it": 0 }) } : undefined, fail });
    assert.equal(await recordPollVoteWithDependencies("visitor-a", poll, "text-again", deps), null); assert.equal(calls.commits, 0); assert.ok(calls.rollbacks >= 1);
  });
}

for (const raw of [JSON.stringify({ "text-again": -1, wait: 0, "leave-it": 0 }), JSON.stringify({ "text-again": 1.5, wait: 0, "leave-it": 0 }), "not-json", JSON.stringify({ "text-again": "many", wait: 0, "leave-it": 0 })]) {
  test("MOCKED UNIT: malformed aggregate fails without resetting or committing", async () => {
    const { deps, calls } = mockDeps({ aggregate: { counts: raw } });
    assert.equal(await recordPollVoteWithDependencies("visitor-a", poll, "text-again", deps), null); assert.equal(calls.commits, 0); assert.equal(calls.creates.length, 0);
  });
}
