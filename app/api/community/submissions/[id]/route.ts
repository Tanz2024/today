import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { z } from "zod";
import { getCurrentCommunityUser } from "@/lib/community-auth";
import { getDatabases } from "@/lib/appwrite";
import { APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, APPWRITE_DATABASE_ID } from "@/lib/community-submissions";
import { storyDocumentSchema } from "@/lib/community-story";
import { getPublicCategories } from "@/lib/categories";

const categories = getPublicCategories().map((item) => item.slug) as [string, ...string[]];
const schema = z.object({ title: z.string().trim().min(5).max(140), category: z.enum(categories), description: z.string().trim().max(240).default(""), content: z.string().trim().min(20).max(40000), coverAlt: z.string().trim().min(1).max(240), coverCredit: z.string().trim().max(240).default(""), consentAccepted: z.literal(true), consentVersion: z.string().trim().min(1).max(40) });

async function ownedDocument(id: string) {
  const user = await getCurrentCommunityUser();
  if (!user) return { error: NextResponse.json({ error: "Email verification required." }, { status: 401 }) };
  const db = getDatabases(); if (!db) return { error: NextResponse.json({ error: "Submission service is temporarily unavailable." }, { status: 503 }) };
  try { const result = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("$id", id), Query.equal("authorId", user.$id), Query.limit(1)]); const document = result.documents[0]; if (!document) return { error: NextResponse.json({ error: "Story not found." }, { status: 404 }) }; return { user, db, document }; } catch { return { error: NextResponse.json({ error: "Unable to load this story." }, { status: 500 }) }; }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const target = await ownedDocument((await params).id); if (target.error) return target.error;
  const { document } = target; return NextResponse.json({ story: { id: document.$id, title: document.title, category: document.category, description: document.description, content: document.content, coverAlt: document.coverAlt ?? "", coverCredit: document.coverCredit ?? "", feedback: document.feedback ?? "", status: document.status } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const target = await ownedDocument((await params).id); if (target.error) return target.error;
  const { db, document } = target;
  if (!(["changes_requested", "rejected"].includes(document.status))) return NextResponse.json({ error: "Only stories awaiting changes can be resubmitted." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please complete the required story fields." }, { status: 400 });
  let content: unknown; try { content = JSON.parse(parsed.data.content); } catch { return NextResponse.json({ error: "Story content is invalid." }, { status: 400 }); }
  if (!storyDocumentSchema.safeParse(content).success) return NextResponse.json({ error: "Story content is invalid." }, { status: 400 });
  const now = new Date().toISOString(); await db.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, document.$id, { title: parsed.data.title, category: parsed.data.category, description: parsed.data.description, content: parsed.data.content, coverAlt: parsed.data.coverAlt, coverCredit: parsed.data.coverCredit, consentAccepted: true, consentVersion: parsed.data.consentVersion, consentAt: now, status: "submitted", submittedAt: now, reviewedAt: "", reviewedBy: "", feedback: "" });
  return NextResponse.json({ ok: true, status: "submitted" });
}
