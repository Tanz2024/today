import { NextRequest, NextResponse } from "next/server";
import { adjustReaction, getReactionCounts, getReactionLock, isReactionType, lockReaction } from "@/lib/reactions";
import { getVisitorId } from "@/lib/identity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }
  const counts = await getReactionCounts(slug);
  return NextResponse.json({ counts });
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

  const { type } = (body ?? {}) as { type?: string };

  if (!isReactionType(type)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
  }

  const visitorId = getVisitorId(req);

  // One reaction per visitor per article, ever — enforced server-side so it
  // can't be bypassed by clearing localStorage or switching browsers.
  // A repeat attempt is silently ignored: it returns the real current counts
  // with no error, so the UI never shows an explicit "locked" state.
  if (visitorId) {
    const existingLock = await getReactionLock(visitorId, slug);
    if (existingLock) {
      const counts = await getReactionCounts(slug);
      return NextResponse.json({ counts, persisted: true });
    }
  }

  let counts;
  try {
    counts = await adjustReaction(slug, type, 1);
  } catch {
    return NextResponse.json({ error: "Reaction could not be saved.", persisted: false }, { status: 500 });
  }
  if (visitorId && counts !== null) {
    await lockReaction(visitorId, slug, type);
  }

  if (!counts) {
    return NextResponse.json({ error: "Reactions are temporarily unavailable.", persisted: false }, { status: 503 });
  }
  return NextResponse.json({ counts, persisted: true });
}
