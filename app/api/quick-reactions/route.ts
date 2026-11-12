import { NextRequest, NextResponse } from "next/server";
import { getQuickReactionCounts, isQuickReactionType, setQuickReaction } from "@/lib/quick-reactions";
import { getVisitorId } from "@/lib/identity";

export async function GET(req: NextRequest) {
  const targetId = req.nextUrl.searchParams.get("targetId");
  if (!targetId) {
    return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
  }

  const counts = await getQuickReactionCounts(targetId);
  return NextResponse.json({ counts });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { targetId, type } = (body ?? {}) as { targetId?: unknown; type?: unknown };

  if (typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
  }
  if (!isQuickReactionType(type)) {
    return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
  }

  const visitorId = getVisitorId(req);
  if (!visitorId) {
    // No visitor identity available (secret not configured) — read-only response.
    const counts = await getQuickReactionCounts(targetId);
    return NextResponse.json({ counts, persisted: false });
  }

  const { counts, persisted } = await setQuickReaction(visitorId, targetId, type);
  return NextResponse.json({ counts, persisted });
}
