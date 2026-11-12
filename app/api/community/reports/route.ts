import { NextRequest, NextResponse } from "next/server";
import { Client, Databases, ID } from "node-appwrite";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getVisitorId } from "@/lib/identity";
import { z } from "zod";

const schema = z.object({ submissionId: z.string().min(1).max(64), reason: z.enum(["harassment", "copyright", "misinformation", "spam", "inappropriate", "other"]), details: z.string().trim().max(1000).default("") });
export async function POST(request: NextRequest) {
  const visitor = getVisitorId(request); if (!visitor) return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503 });
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null; if (!redis) return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503 });
  if (!(await new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "community:report" }).limit(visitor)).success) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Please choose a report reason." }, { status: 400 });
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_COMMUNITY_REPORTS_COLLECTION_ID: collection = "community_reports" } = process.env;
  if (!endpoint || !project || !key) return NextResponse.json({ error: "Reporting is temporarily unavailable." }, { status: 503 });
  try { const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key)); await db.createDocument(database, collection, ID.unique(), { ...parsed.data, visitorHash: visitor, status: "open", createdAt: new Date().toISOString() }); return NextResponse.json({ ok: true }, { status: 201 }); } catch { return NextResponse.json({ error: "Could not submit the report." }, { status: 500 }); }
}
