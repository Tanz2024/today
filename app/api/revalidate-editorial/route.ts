import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateTag("daily-interactive", "max");
  revalidateTag("homepage-editorial", "max");
  revalidateTag("editorial-slot-daily_song_pick", "max");
  revalidatePath("/", "page");

  return NextResponse.json({ ok: true });
}
