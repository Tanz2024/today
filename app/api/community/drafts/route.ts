import { NextRequest, NextResponse } from "next/server";
import { getCurrentCommunityUser } from "@/lib/community-auth";
import { getCommunityDrafts, findCommunityDraft, saveCommunityDraft } from "@/lib/community-drafts";

export async function GET() {
  const user = await getCurrentCommunityUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const databases = getCommunityDrafts();
  if (!databases) return NextResponse.json({ error: "Draft service is temporarily unavailable." }, { status: 503 });
  try {
    const draft = await findCommunityDraft(databases, user.$id);
    return NextResponse.json({ draft: draft ? { id: draft.$id, title: draft.title, value: draft.draft, updatedAt: draft.updatedAt } : null });
  } catch { return NextResponse.json({ error: "Could not load your draft." }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentCommunityUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { title?: unknown; value?: unknown } | null;
  if (typeof body?.value !== "string" || body.value.length > 250000) return NextResponse.json({ error: "Invalid draft." }, { status: 400 });
  const databases = getCommunityDrafts();
  if (!databases) return NextResponse.json({ error: "Draft service is temporarily unavailable." }, { status: 503 });
  try {
    const draft = await saveCommunityDraft(databases, user.$id, typeof body.title === "string" ? body.title : "", body.value);
    return NextResponse.json({ ok: true, updatedAt: draft.updatedAt });
  } catch { return NextResponse.json({ error: "Could not save your draft." }, { status: 500 }); }
}
