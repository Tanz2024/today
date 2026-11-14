import { cp, mkdir, rm } from "node:fs/promises";
// Copies the shared source the function runs. Keep this list in sync with the
// imports of lib/editorial-daily-runner.mjs.
await mkdir("lib", { recursive: true });
await cp("../../lib/editorial-daily-runner.mjs", "lib/editorial-daily-runner.mjs");
await cp("../../lib/execution-budget.mjs", "lib/execution-budget.mjs");
// Remove runtime files left over from the retired lifestyle edition.
for (const stale of ["lib/editorial-daily-ai.mjs", "lib/editorial-providers.mjs", "lib/cron-fetch.mjs", "lib/daily-trend-pack.mjs", "content"]) await rm(stale, { recursive: true, force: true });
console.log("Prepared editorial-daily runtime files.");
