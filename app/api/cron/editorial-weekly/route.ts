import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runEditorialWeekly } from "@/lib/editorial-weekly-runner.mjs";
import { alertCronFailure, alertCronSuccess } from "@/lib/cron-alerts";
import { acquireCronLease } from "@/lib/cron-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lock = await acquireCronLease("editorial-weekly");
  if (!lock.acquired) return NextResponse.json({ ok: false, status: lock.reason === "already-running" ? "already-running" : "lock-unavailable" }, { status: lock.reason === "already-running" ? 202 : 503 });
  const startedAt = Date.now();
  console.log("[cron/editorial-weekly] started", JSON.stringify({ invocationId: lock.lease.invocationId, jobName: "editorial-weekly", lock: "acquired" }));
  try {
    const result = await runEditorialWeekly();
    // Screen editions are published independently of music. A failed or
    // preserved music edition must not leave fresh movie, TV, or anime rows
    // hidden behind the old shared homepage cache.
    revalidateTag("editorial-slot-on_screen_movie", "max");
    revalidateTag("editorial-slot-on_screen_tv", "max");
    revalidateTag("editorial-slot-on_screen_anime", "max");
    if (!("musicPublication" in result) || result.musicPublication !== "preserved-current-edition") {
      revalidateTag("editorial-slot-on_repeat_music", "max");
    }
    revalidateTag("weekly-editorial", "max");
    revalidateTag("homepage-editorial", "max");
    console.log("[cron/editorial-weekly] completed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "completed", picks: result.picks ?? 0 }));
    await lock.release("completed");
    await alertCronSuccess("editorial-weekly", result as { dateKey?: string; publishAt?: string; idempotent?: boolean });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[cron/editorial-weekly] failed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "failed", error: error instanceof Error ? error.message : "unknown error" }));
    await lock.release("failed");
    await alertCronFailure("editorial-weekly", error);
    return NextResponse.json({ error: "Weekly editorial run failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
