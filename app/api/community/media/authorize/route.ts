import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getCurrentCommunityUser } from "@/lib/community-auth";
import { createCommunityUpload, communityMediaKey } from "@/lib/r2";
import { APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, APPWRITE_DATABASE_ID } from "@/lib/community-submissions";
import { getDatabases } from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { getVisitorId } from "@/lib/identity";

export const runtime = "nodejs";

const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const videoTypes: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov" };

export async function POST(request: NextRequest) {
  const user = await getCurrentCommunityUser();
  const ownerId = user?.$id ?? getVisitorId(request);
  if (!ownerId) return NextResponse.json({ error: "Upload verification is temporarily unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { mediaType?: unknown; mimeType?: unknown; size?: unknown } | null;
  const mediaType = body?.mediaType === "video" ? "video" : body?.mediaType === "cover" ? "cover" : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const size = Number(body?.size);
  const extension = mediaType === "cover" ? imageTypes[mimeType] : videoTypes[mimeType];
  const maxBytes = mediaType === "cover" ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
  if (!extension || !Number.isSafeInteger(size) || size <= 0 || size > maxBytes) return NextResponse.json({ error: "That media file is not supported." }, { status: 400 });
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
  if (!redis) return NextResponse.json({ error: "Upload service is temporarily unavailable." }, { status: 503 });
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "community:media" });
  if (!(await limiter.limit(`visitor:${ownerId}`)).success) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  const databases = getDatabases();
  if (!databases) return NextResponse.json({ error: "Submission service is temporarily unavailable." }, { status: 503 });
  const pending = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID, [Query.equal("authorId", ownerId), Query.equal("status", "submitted"), Query.limit(4)]);
  if (pending.total >= 3) return NextResponse.json({ error: "You already have three stories waiting for review." }, { status: 429 });
  const mediaId = randomUUID();
  const objectKey = communityMediaKey(ownerId, mediaId, extension);
  const upload = await createCommunityUpload(objectKey, mimeType);
  await redis.set(`community:media:${mediaId}`, JSON.stringify({ ownerUserId: ownerId, objectKey, mediaType, expectedMimeType: mimeType, maxBytes, state: "authorized" }), { ex: 60 * 60 });
  return NextResponse.json({ mediaId, uploadUrl: upload.url, contentType: mimeType, expiresIn: 300 });
}
