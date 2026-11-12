import { NextRequest, NextResponse } from "next/server";
import { runEditorialDailyMaintenance } from "@/lib/editorial-daily-runner.mjs";
import { alertCronFailure, alertCronSuccess } from "@/lib/cron-alerts";
import { acquireCronLease } from "@/lib/cron-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lock = await acquireCronLease("editorial-daily-maintenance");
  if (!lock.acquired) return NextResponse.json({ ok: false, status: lock.reason === "already-running" ? "already-running" : "lock-unavailable" }, { status: lock.reason === "already-running" ? 202 : 503 });
  const startedAt = Date.now();
  console.log("[cron/editorial-daily-maintenance] started", JSON.stringify({ invocationId: lock.lease.invocationId, jobName: "editorial-daily-maintenance", lock: "acquired" }));
  try {
    const result = await runEditorialDailyMaintenance();
    const cleanup = (result.cleanup && typeof result.cleanup === "object" ? result.cleanup : {}) as { status?: string; scanned?: number; deleted?: number };
    console.log("[cron/editorial-daily-maintenance] completed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "completed", curation: result.curation?.status, cleanup: cleanup.status, scanned: cleanup.scanned ?? 0, deleted: cleanup.deleted ?? 0 }));
    await lock.release("completed");
    await alertCronSuccess("editorial-daily-maintenance", result);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[cron/editorial-daily-maintenance] failed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "failed", error: error instanceof Error ? error.message : "unknown error" }));
    await lock.release("failed");
    await alertCronFailure("editorial-daily-maintenance", error);
    return NextResponse.json({ error: "Daily editorial maintenance failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
