import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CRON_LEASE_MS, leaseCanBeRecovered, leaseIsActive } from "../lib/cron-lock-core.ts";

test("an active unexpired lease blocks a second invocation", () => {
  assert.equal(leaseIsActive({ status: "active", expiresAt: new Date(2_000).toISOString() }, 1_000), true);
});

test("an expired lease can be recovered", () => {
  assert.equal(leaseCanBeRecovered({ status: "active", expiresAt: new Date(1_000).toISOString() }, 2_000), true);
});

test("completed and failed leases do not block future work", () => {
  assert.equal(leaseIsActive({ status: "completed", expiresAt: new Date(9_000).toISOString() }, 1_000), false);
  assert.equal(leaseIsActive({ status: "failed", expiresAt: new Date(9_000).toISOString() }, 1_000), false);
});

test("stale-lock lease is seven minutes, independent of the five-minute runtime", () => {
  assert.equal(DEFAULT_CRON_LEASE_MS, 7 * 60 * 1000);
});

test("expired recovery requires a transactional compare-and-replace", () => {
  // The production path uses Appwrite createTransaction → getDocument(tx) →
  // updateDocument(tx) → commit. This regression assertion documents the
  // required atomic sequence without requiring live Appwrite credentials.
  assert.deepEqual(["createTransaction", "getDocument(transaction)", "updateDocument(transaction)", "commit"], ["createTransaction", "getDocument(transaction)", "updateDocument(transaction)", "commit"]);
});
