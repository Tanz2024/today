import test from "node:test";
import assert from "node:assert/strict";
import { cronFetch, isCronFetchTimeout } from "../lib/cron-fetch.mjs";

test("cron fetch genuinely aborts a slow request", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true }));
  try { await assert.rejects(() => cronFetch("https://example.test", {}, 10), (error) => isCronFetchTimeout(error)); }
  finally { globalThis.fetch = original; }
});
