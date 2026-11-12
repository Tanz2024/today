/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import { cookies } from "next/headers";
import { isModeratorTokenValid, moderatorCookieName } from "@/lib/editorial-moderation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(moderatorCookieName)?.value;
  if (!isModeratorTokenValid(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { decision } = await request.json().catch(() => ({}));
  if (decision !== "published" && decision !== "rejected") return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content", APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID: communityCollection = "community_submissions" } = process.env;
  if (!endpoint || !project || !key) return NextResponse.json({ error: "Appwrite unavailable" }, { status: 503 });
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const id = (await params).id;
  try {
    const now = new Date().toISOString();
    try {
      const community = await db.getDocument(database, communityCollection, id) as any;
      if (community.source === "community" && ["submitted", "in_review", "changes_requested"].includes(community.status)) {
        await db.updateDocument(database, communityCollection, id, {
          status: decision === "published" ? "published" : "rejected",
          feedback: decision === "published" ? "Approved for publication." : "This submission was not accepted for publication.",
          reviewedAt: now,
          reviewedBy: "editorial-moderation",
          publishedAt: decision === "published" ? now : "",
        });
        try {
          const auditCollection = process.env.APPWRITE_COMMUNITY_AUDIT_COLLECTION_ID ?? "community_moderation_audit";
          await db.createDocument(database, auditCollection, ID.unique(), { submissionId: id, previousStatus: community.status, newStatus: decision === "published" ? "published" : "rejected", action: decision === "published" ? "publish" : "reject", reason: decision === "published" ? "Approved for publication." : "This submission was not accepted for publication.", moderatorId: "editorial-moderation", createdAt: now });
        } catch { /* audit storage is optional until setup is run */ }
        return NextResponse.json({ ok: true, status: decision === "published" ? "published" : "rejected" });
      }
    } catch { /* not a Community submission; try the editorial collection */ }
    const row = await db.getDocument(database, collection, id) as any;
    if (row.type !== "article" || row.status !== "candidate") return NextResponse.json({ error: "Draft is no longer available" }, { status: 409 });
    await db.updateDocument(database, collection, id, { status: decision, publishAt: decision === "published" ? now : null, updatedAt: now });
    return NextResponse.json({ ok: true, status: decision });
  }
  catch { return NextResponse.json({ error: "Draft is no longer available" }, { status: 409 }); }
}
