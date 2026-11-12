import test from "node:test";
import assert from "node:assert/strict";
import { hasRequiredAppwriteEnv } from "../lib/appwrite-env.ts";

const complete = {
  APPWRITE_ENDPOINT: "https://fra.cloud.appwrite.io/v1",
  APPWRITE_PROJECT_ID: "proj123",
  APPWRITE_API_KEY: "secret",
  APPWRITE_DATABASE_ID: "brisastory",
};

test("passes when all four required vars are present", () => {
  assert.equal(hasRequiredAppwriteEnv(complete), true);
});

test("fails when any single required var is missing", () => {
  for (const key of Object.keys(complete) as (keyof typeof complete)[]) {
    const partial = { ...complete, [key]: undefined };
    assert.equal(hasRequiredAppwriteEnv(partial), false, `should fail without ${key}`);
  }
});

test("fails on an empty-string value, not just undefined", () => {
  assert.equal(hasRequiredAppwriteEnv({ ...complete, APPWRITE_API_KEY: "" }), false);
});

test("fails on a placeholder or non-http endpoint instead of crashing the SDK", () => {
  for (const endpoint of ["[SENSITIVE]", "cloud.appwrite.io/v1", "ftp://example.com", " "]) {
    assert.equal(hasRequiredAppwriteEnv({ ...complete, APPWRITE_ENDPOINT: endpoint }), false, endpoint);
  }
});

test("fails on a completely empty env", () => {
  assert.equal(hasRequiredAppwriteEnv({}), false);
});
