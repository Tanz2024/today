import { NextRequest, NextResponse } from "next/server";
import { getReadStats, recordReadTime } from "@/lib/read-stats";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  return NextResponse.json({ stats: await getReadStats(slug) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { seconds } = (body ?? {}) as { seconds?: unknown };
  if (typeof seconds !== "number") {
    return NextResponse.json({ error: "Invalid seconds value" }, { status: 400 });
  }

  const sampleCount = await recordReadTime(slug, seconds);
  return NextResponse.json({ ok: true, sampleCount });
}
