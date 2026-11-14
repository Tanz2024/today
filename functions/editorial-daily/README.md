# TodayAI editorial-daily Appwrite Function

Entry point: `src/index.js`. It runs the shared `lib/editorial-daily-runner.mjs` (copied in by `npm run build` in this directory).

**Current status: no-op.** The lifestyle "daily interactive edition" this function used to generate (Daily Drop, poll, trivia, group-chat prompt, this-or-that, song pick) was retired when TodayAI became AI-only. `runEditorialDaily()` now logs `run_skipped` and writes nothing. Records written earlier are left untouched in Appwrite.

Owner action: the function's schedule (`0 16 * * *`) is configured in Appwrite, not in this repository. Disable or delete that schedule in the Appwrite console when convenient, or keep it until an AI-focused daily job replaces it.

The Next.js deployment still schedules `/api/cron/editorial-daily-maintenance` (homepage curation and bounded draft cleanup).
