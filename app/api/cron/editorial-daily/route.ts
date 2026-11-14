import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { runEditorialDaily } from "@/lib/editorial-daily-runner.mjs";
import { alertCronFailure, alertCronSuccess } from "@/lib/cron-alerts";
import { acquireCronLease } from "@/lib/cron-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function revalidateDailyEditorialPages() {
  revalidateTag("daily-interactive", "max");
  revalidateTag("homepage-editorial", "max");
  revalidateTag("editorial-slot-daily_song_pick", "max");
  revalidatePath("/", "page");
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lock = await acquireCronLease("editorial-daily");
  if (!lock.acquired) return NextResponse.json({ ok: false, status: lock.reason === "already-running" ? "already-running" : "lock-unavailable" }, { status: lock.reason === "already-running" ? 202 : 503 });
  const invocationId = lock.lease.invocationId;
  const startedAt = Date.now();
  console.log("[cron/editorial-daily] started", JSON.stringify({ invocationId, jobName: "editorial-daily", lock: "acquired", startedAt: new Date(startedAt).toISOString() }));
  try {
    const result = await runEditorialDaily();
    revalidateDailyEditorialPages();
    const resultRecord = result as typeof result & { published?: string[]; idempotent?: boolean; songPick?: string | null };
    console.log("[cron/editorial-daily] completed", JSON.stringify({ invocationId, elapsedMs: Date.now() - startedAt, ...(
      result.dryRun
        ? { dateKey: result.dateKey, dryRun: true, items: result.items, automation: result.automation }
        : {
            dateKey: result.dateKey,
            published: resultRecord.published ?? [],
            idempotent: resultRecord.idempotent ?? false,
            songPick: resultRecord.songPick ?? null,
            automation: result.automation,
          }
    ) }));
    await lock.release("completed");
    await alertCronSuccess("editorial-daily", result);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[cron/editorial-daily] failed", JSON.stringify({ invocationId, elapsedMs: Date.now() - startedAt, status: "failed", error: error instanceof Error ? error.message : "unknown error" }));
    await lock.release("failed");
    await alertCronFailure("editorial-daily", error);
    return NextResponse.json({ error: "Daily editorial run failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { return GET(request); }
