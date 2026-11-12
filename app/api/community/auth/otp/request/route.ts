import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { abuseHash, isAllowedOrigin } from "@/lib/contact-security";
import { normalizeEmail, requestCommunityOtp } from "@/lib/community-auth";

export const runtime = "nodejs";

async function verifyTurnstile(token: unknown, request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || !token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "" }),
  });
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  const hostname = request.headers.get("host")?.split(":")[0];
  return result.success === true && (!result.hostname || result.hostname === hostname) && (!result.action || result.action === "community-otp");
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"), process.env.NODE_ENV === "production")) return NextResponse.json({ error: "Unable to process this request." }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: unknown; turnstileToken?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!(await verifyTurnstile(body?.turnstileToken, request))) return NextResponse.json({ error: "Unable to verify this request." }, { status: 400 });
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
  if (!redis) return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "15 m"), prefix: "community:otp" });
  const result = await limiter.limit(abuseHash(`${email}:${ip}`));
  if (!result.success) return NextResponse.json({ error: "Please try again later.", retryAfter: result.reset }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) } });
  try {
    const token = await requestCommunityOtp(email);
    return NextResponse.json({ ok: true, userId: token.userId, phrase: token.phrase ?? null });
  } catch (error) {
    console.error("[community-auth] OTP request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "If this address can receive email, a verification code has been sent." }, { status: 202 });
  }
}
