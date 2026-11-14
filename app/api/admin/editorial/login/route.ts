import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { abuseHash, isAllowedOrigin } from "@/lib/contact-security";
import { MODERATOR_SESSION_SECONDS, createModeratorToken, isModeratorPasswordValid, moderatorCookieName } from "@/lib/editorial-moderation";

export const runtime = "nodejs";

const getIp = (request: NextRequest) => request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

// Per-instance fallback when Redis isn't configured (weaker: resets on cold
// start and isn't shared between instances).
const memoryAttempts = new Map<string, { count: number; resetAt: number }>();
function memoryLimited(id: string, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = memoryAttempts.get(id);
  if (!entry || entry.resetAt < now) { memoryAttempts.set(id, { count: 1, resetAt: now + windowMs }); return false; }
  entry.count += 1;
  return entry.count > max;
}

async function isRateLimited(id: string) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    const short = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "moderator-login:ip" });
    const daily = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 d"), prefix: "moderator-login:daily" });
    const [a, b] = await Promise.all([short.limit(id), daily.limit(id)]);
    return !a.success || !b.success;
  }
  return memoryLimited(id);
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"), process.env.NODE_ENV === "production")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await isRateLimited(abuseHash(getIp(request)))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { password?: unknown };
  if (!isModeratorPasswordValid(body.password)) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(moderatorCookieName, createModeratorToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: MODERATOR_SESSION_SECONDS, path: "/" });
  return response;
}
