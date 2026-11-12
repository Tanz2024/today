import { NextRequest, NextResponse } from "next/server";
import { createCommunitySession } from "@/lib/community-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { userId?: unknown; secret?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const secret = typeof body?.secret === "string" ? body.secret.trim() : "";
  if (!userId || !/^\d{6}$/.test(secret)) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  try {
    await createCommunitySession(userId, secret);
    const { getCurrentCommunityUser } = await import("@/lib/community-auth");
    const user = await getCurrentCommunityUser();
    if (!user) return NextResponse.json({ error: "Unable to verify this session." }, { status: 401 });
    return NextResponse.json({ ok: true, user: { id: user.$id, email: user.email, name: user.name, emailVerification: user.emailVerification } });
  } catch {
    return NextResponse.json({ error: "That code is invalid or expired." }, { status: 401 });
  }
}
