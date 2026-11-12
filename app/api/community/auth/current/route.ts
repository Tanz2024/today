import { NextResponse } from "next/server";
import { getCurrentCommunityUser } from "@/lib/community-auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentCommunityUser();
  return user ? NextResponse.json({ authenticated: true, user: { id: user.$id, email: user.email, name: user.name, emailVerification: user.emailVerification } }) : NextResponse.json({ authenticated: false }, { status: 401 });
}
