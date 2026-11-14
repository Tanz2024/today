import { createExecutionBudget } from "./execution-budget.mjs";

// Daily editorial job.
//
// The former "daily interactive edition" (Daily Drop, Pulse poll, trivia,
// group-chat prompt, this-or-that and a Spotify/ListenBrainz song pick) was
// lifestyle content for pages TodayAI no longer has, so its generation was
// retired. Records it wrote earlier stay in Appwrite untouched.
//
// What remains: the scheduled maintenance phase (homepage curation and
// bounded draft cleanup), the cron route, its job lock and alerts. AI-topic
// article drafting lives in lib/editorial-daily/article-runner.mjs and always
// creates drafts for moderation; it is not scheduled until the article
// generator is retargeted from lifestyle desks to AI coverage.

function malaysiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now);
}

function dailyLog(event, details = {}) {
  // Structured operational context; never credentials or raw provider responses.
  console.log(`[editorial-daily] ${event}`, JSON.stringify(details));
}

/** Kept for the cron route and Appwrite function; generates nothing now. */
export async function runEditorialDaily({ dryRun = false, now = new Date() } = {}) {
  const dateKey = malaysiaDate(now);
  const result = { dryRun, dateKey, automation: { status: "retired", reason: "lifestyle daily edition retired; no AI daily job configured" }, items: [], published: [], idempotent: true, songPick: null };
  dailyLog("run_skipped", { dateKey, reason: result.automation.reason });
  return result;
}

export async function runEditorialDailyMaintenance({ now = new Date() } = {}) {
  const [{ runDailyHomepageCuration }, { runDailyCleanup }] = await Promise.all([
    import("./editorial-daily/curation-runner.mjs"),
    import("./editorial-daily/cleanup-runner.mjs"),
  ]);
  const budget = createExecutionBudget({ onExhausted: (details) => dailyLog("budget_exhausted", details) });
  const dateKey = malaysiaDate(now);
  const startedAt = Date.now();
  dailyLog("maintenance_phase_started", { dateKey, phase: "curation" });
  const curation = budget.checkpoint("maintenance-curation") ? await runDailyHomepageCuration(now).catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "curation failed" })) : { status: "budget-exhausted" };
  dailyLog("maintenance_phase_finished", { dateKey, phase: "curation", elapsedMs: Date.now() - startedAt, status: curation?.status ?? "unknown" });
  const cleanupStartedAt = Date.now();
  dailyLog("maintenance_phase_started", { dateKey, phase: "cleanup" });
  const cleanup = budget.checkpoint("maintenance-cleanup") ? await runDailyCleanup({ maxPagesPerCollection: 2, maxItemsPerRun: 200, budget }).catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "cleanup failed" })) : { status: "budget-exhausted" };
  const cleanupRecord = cleanup && typeof cleanup === "object" ? cleanup : {};
  dailyLog("maintenance_phase_finished", { dateKey, phase: "cleanup", elapsedMs: Date.now() - cleanupStartedAt, status: cleanupRecord.status ?? "unknown", scanned: cleanupRecord.scanned ?? 0, deleted: cleanupRecord.deleted ?? 0, bounded: cleanupRecord.bounded ?? false });
  const result = { dateKey, curation, cleanup };
  dailyLog("maintenance_completed", { dateKey, elapsedMs: Date.now() - startedAt, curationStatus: curation?.status ?? "unknown", cleanupStatus: cleanup?.status ?? "unknown" });
  return result;
}
