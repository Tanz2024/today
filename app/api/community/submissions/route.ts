import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { Query, ID } from "node-appwrite";
import { z } from "zod";
import { getCurrentCommunityUser } from "@/lib/community-auth";
import { getDatabases } from "@/lib/appwrite";
import { APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, APPWRITE_DATABASE_ID } from "@/lib/community-submissions";
import { verifyCommunityObject } from "@/lib/r2";
import { verifyTurnstile } from "@/lib/turnstile";
import { countStoryImages, storyDocumentSchema } from "@/lib/community-story";
import { getVisitorId } from "@/lib/identity";
import { getPublicCategories } from "@/lib/categories";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { notifyCommunity } from "@/lib/community-notifications";

const categoryValues = getPublicCategories().map((category) => category.slug) as [string, ...string[]];
const schema = z.object({ displayName: z.string().trim().min(2).max(50), title: z.string().trim().min(5).max(140), category: z.enum(categoryValues), tags: z.array(z.string().trim().min(1).max(40)).max(5).default([]), description: z.string().trim().max(240).default(""), content: z.string().trim().min(20).max(40000), coverMediaId: z.string().uuid(), videoMediaId: z.string().uuid().optional(), coverAlt: z.string().trim().min(1).max(240), coverCredit: z.string().trim().max(240).default(""), consentAccepted: z.literal(true), consentVersion: z.string().trim().min(1).max(40), idempotencyKey: z.string().min(16).max(160), turnstileToken: z.string().max(4096).optional().default(""), reactions: z.array(z.string().regex(/^\p{Extended_Pictographic}$/u)).max(5).default([]), readerQuestion: z.string().trim().max(240).default("") });

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150) || "community-story"; }

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 500_000) return NextResponse.json({ error: "This submission is too large." }, { status: 413 });
  const user = await getCurrentCommunityUser();
  const ownerId = user?.$id ?? getVisitorId(request);
  if (!ownerId) return NextResponse.json({ error: "Submission verification is temporarily unavailable." }, { status: 503 });
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
  if (!redis) return NextResponse.json({ error: "Submission service is temporarily unavailable." }, { status: 503 });
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "community:submit" });
  if (!(await limiter.limit(`owner:${ownerId}`)).success) return NextResponse.json({ error: "You have reached the submission limit. Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete the required story fields." }, { status: 400 });
  const data = parsed.data;
  if (!(await verifyTurnstile(data.turnstileToken, request, "community-submit"))) return NextResponse.json({ error: "Please complete the verification check." }, { status: 400 });
  let storyDocument: ReturnType<typeof storyDocumentSchema.parse> | null = null;
  try { const candidate = JSON.parse(data.content); const checked = storyDocumentSchema.safeParse(candidate); if (checked.success) { if (countStoryImages(checked.data) > 10) return NextResponse.json({ error: "A story can contain up to ten inline images." }, { status: 400 }); storyDocument = checked.data; } } catch {}
  if (!storyDocument) return NextResponse.json({ error: "Please use the current Community editor format." }, { status: 400 });
  const databases = getDatabases();
  if (!databases) return NextResponse.json({ error: "Submission service is temporarily unavailable." }, { status: 503 });
  const existing = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("authorId", ownerId), Query.equal("idempotencyKey", data.idempotencyKey), Query.limit(1)]);
  if (existing.documents[0]) return NextResponse.json({ ok: true, id: existing.documents[0].$id, status: existing.documents[0].status });
  const pending = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("authorId", ownerId), Query.equal("status", "submitted"), Query.limit(4)]);
  if (pending.total >= 3) return NextResponse.json({ error: "You already have three stories waiting for review." }, { status: 429 });
  const redisPackage = redis;
  const coverRaw = await redisPackage.get<string>(`community:media:${data.coverMediaId}`);
  const cover: { ownerUserId: string; objectKey: string; expectedMimeType: string; maxBytes: number; state?: string } | null = typeof coverRaw === "string" ? JSON.parse(coverRaw) : coverRaw as typeof coverRaw;
  if (!cover || cover.ownerUserId !== ownerId || cover.state !== "authorized" || !(await verifyCommunityObject(cover.objectKey, cover.maxBytes, cover.expectedMimeType))) return NextResponse.json({ error: "Cover upload could not be verified." }, { status: 400 });
  let video: typeof cover | null = null;
  if (data.videoMediaId) { const raw = await redisPackage.get<string>(`community:media:${data.videoMediaId}`); video = typeof raw === "string" ? JSON.parse(raw) : raw as typeof raw; if (!video || video.ownerUserId !== ownerId || video.state !== "authorized" || !(await verifyCommunityObject(video.objectKey, video.maxBytes, video.expectedMimeType))) return NextResponse.json({ error: "Video upload could not be verified." }, { status: 400 }); }
  const referencedMediaIds = storyDocument.blocks.flatMap((block) => block.type === "image" || block.type === "video" ? [block.media.id] : block.type === "gallery" ? block.items.map((item) => item.id) : []).filter((id): id is string => Boolean(id));
  if (referencedMediaIds.some((id) => id !== data.coverMediaId && id !== data.videoMediaId)) return NextResponse.json({ error: "Story media references are not authorized." }, { status: 400 });
  const now = new Date().toISOString();
  const slug = `${slugify(data.title)}-${randomUUID().slice(0, 8)}`;
  const contentHash = createHash("sha256").update(`${data.title}\n${data.content}`).digest("hex");
  const document = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, ID.unique(), { source: "community", status: "submitted", authorId: ownerId, authorEmail: user?.email ?? "", displayNameSnapshot: data.displayName, avatarReference: "", title: data.title, slug, category: data.category, tags: JSON.stringify(data.tags), description: data.description, content: data.content, coverAlt: data.coverAlt, coverCredit: data.coverCredit, reactions: JSON.stringify(data.reactions), readerQuestion: data.readerQuestion, coverMediaId: data.coverMediaId, videoMediaId: data.videoMediaId ?? "", coverObjectKey: cover.objectKey, videoObjectKey: video?.objectKey ?? "", contentHash, idempotencyKey: data.idempotencyKey, feedback: "", consentAccepted: true, consentVersion: data.consentVersion, consentAt: now, createdAt: now, submittedAt: now, publishedAt: "", reviewedAt: "", reviewedBy: "" });
  await notifyCommunity(user?.email, "Your TodayAI submission was received", `Thanks for sharing “${data.title}”. Our editorial team will review it.`);
  await redisPackage.set(`community:media:${data.coverMediaId}`, JSON.stringify({ ...cover, state: "attached", submissionId: document.$id }), { ex: 60 * 60 * 24 * 30 });
  if (video && data.videoMediaId) await redisPackage.set(`community:media:${data.videoMediaId}`, JSON.stringify({ ...video, state: "attached", submissionId: document.$id }), { ex: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true, id: document.$id, status: "pending" }, { status: 201 });
}

export async function GET() {
  const user = await getCurrentCommunityUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const databases = getDatabases();
  if (!databases) return NextResponse.json({ error: "Submission service is temporarily unavailable." }, { status: 503 });
  try {
    const result = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("authorId", user.$id), Query.orderDesc("createdAt"), Query.limit(50)]);
    return NextResponse.json({ submissions: result.documents.map((row) => ({ id: row.$id, title: row.title, slug: row.slug, category: row.category, status: row.status, feedback: row.feedback ?? "", submittedAt: row.submittedAt ?? "", publishedAt: row.publishedAt ?? "" })) });
  } catch { return NextResponse.json({ error: "Could not load your submissions." }, { status: 500 }); }
}
