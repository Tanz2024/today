import { NextRequest, NextResponse } from "next/server";
import { runWeeklyFoodTravel } from "@/lib/editorial-food-travel-ai.mjs";
import { alertCronFailure, alertCronSuccess } from "@/lib/cron-alerts";
import { acquireCronLease } from "@/lib/cron-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Weekly Food & Drink + Travel & City Life long-form drafts. This never
// publishes anything itself — runWeeklyFoodTravel always calls the canonical
// writer with autoPublish: false, so successful runs only add rows to the
// moderator review desk (status "candidate"). Nothing here needs to
// revalidate homepage/article cache tags because nothing becomes visible.
//
// The beat (discovery/food/travel) is normally driven by the ?beat= query
// param set per cron entry in vercel.json, so Monday/Wednesday/Friday each
// hit the same route with an explicit beat. If it's ever triggered without
// one (a manual run), runWeeklyFoodTravel falls back to Malaysia-time
// calendar detection.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const beatParam = request.nextUrl.searchParams.get("beat") ?? "automatic";
  const lock = await acquireCronLease(`editorial-food-travel-${beatParam}`);
  if (!lock.acquired) return NextResponse.json({ ok: false, status: lock.reason === "already-running" ? "already-running" : "lock-unavailable" }, { status: lock.reason === "already-running" ? 202 : 503 });
  const startedAt = Date.now();
  console.log("[cron/editorial-food-travel] started", JSON.stringify({ invocationId: lock.lease.invocationId, jobName: `editorial-food-travel-${beatParam}`, lock: "acquired", beat: beatParam }));
  try {
    const result = await runWeeklyFoodTravel({ beatParam: beatParam === "automatic" ? undefined : beatParam });
    console.log("[cron/editorial-food-travel] completed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "completed", beat: beatParam }));
    await lock.release("completed");
    await alertCronSuccess("editorial-food-travel", { dateKey: result.schedule?.food?.dateKey });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[cron/editorial-food-travel] failed", JSON.stringify({ invocationId: lock.lease.invocationId, elapsedMs: Date.now() - startedAt, status: "failed", error: error instanceof Error ? error.message : "unknown error" }));
    await lock.release("failed");
    await alertCronFailure("editorial-food-travel", error);
    return NextResponse.json({ error: "Weekly Food & Drink / Travel run failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
