import { NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@/lib/read-stats";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const metric = body?.metric;
  if (!slug || !["pageViews", "uniqueReaders", "repeatViews"].includes(metric)) {
    return NextResponse.json({ error: "Invalid page-view metric" }, { status: 400 });
  }
  const value = await recordPageView(slug, metric);
  return NextResponse.json({ ok: value !== null, value });
}
