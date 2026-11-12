import { NextResponse } from "next/server";
import { deleteCommunitySession } from "@/lib/community-auth";

export const runtime = "nodejs";

export async function POST() {
  await deleteCommunitySession();
  return NextResponse.json({ ok: true });
}
