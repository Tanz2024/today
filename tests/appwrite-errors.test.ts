import test from "node:test";
import assert from "node:assert/strict";
import { isAppwriteDatabaseReadQuotaError, isAppwriteDatabaseUnavailable } from "../lib/appwrite-errors.ts";

test("recognizes only the database-read quota error", () => {
  assert.equal(isAppwriteDatabaseReadQuotaError({ code: 402, type: "limit_databases_reads_exceeded" }), true);
  assert.equal(isAppwriteDatabaseReadQuotaError({ status: 402, errorType: "limit_databases_reads_exceeded" }), true);
  assert.equal(isAppwriteDatabaseReadQuotaError({ code: 402 }), false);
  for (const code of [401, 403, 404, 500]) assert.equal(isAppwriteDatabaseReadQuotaError({ code, type: "limit_databases_reads_exceeded" }), false);
  assert.equal(isAppwriteDatabaseReadQuotaError(new Error("limit_databases_reads_exceeded")), false);
});

test("recognizes a paused Appwrite project as unavailable", () => {
  assert.equal(isAppwriteDatabaseUnavailable({ code: 403, type: "project_paused" }), true);
  assert.equal(isAppwriteDatabaseUnavailable({ response: JSON.stringify({ code: 403, type: "project_paused" }) }), true);
  assert.equal(isAppwriteDatabaseUnavailable({ code: 403, type: "permission_denied" }), false);
});
