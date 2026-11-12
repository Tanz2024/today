import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { abuseHash, isAllowedOrigin, isHoneypotTriggered, isTooFast } from "@/lib/contact-security";
import { newsletterSchema } from "@/lib/newsletter-security";
import { subscribeToMailerLite } from "@/lib/mailerlite";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 2_000;

const errorResponse = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const getIp = (request: NextRequest) =>
  request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

function getRedis() {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
}

async function isRateLimited(redis: Redis, ip: string): Promise<boolean> {
  const identifier = abuseHash(ip);
  const short = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "10 m"), prefix: "newsletter:ip" });
  const daily = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 d"), prefix: "newsletter:daily" });
  const [shortResult, dailyResult] = await Promise.all([short.limit(identifier), daily.limit(identifier)]);
  return !shortResult.success || !dailyResult.success;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"), process.env.NODE_ENV === "production")) {
    return errorResponse("Unable to process this request.", 403);
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return errorResponse("Unable to process this request.", 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return errorResponse("Unable to process this request.", 413);
    body = JSON.parse(raw);
  } catch {
    return errorResponse("Please try again.", 400);
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Please enter a valid email address.", 400);
  const data = parsed.data;

  // Honeypot: pretend success so bots don't learn anything from the response.
  if (isHoneypotTriggered(data.website)) return NextResponse.json({ ok: true, alreadySubscribed: false });
  // Newsletter signup is a deliberately small, one-field form. A 2.5s
  // threshold rejects legitimate mobile readers who paste an address and
  // submit quickly, so use a shorter bot signal here while retaining the
  // honeypot, origin, rate-limit and MailerLite checks.
  if (isTooFast(data.startedAt, Date.now(), 800)) return errorResponse("Please try again.", 400);

  const redis = getRedis();
  if (!redis) return errorResponse("Signup is temporarily unavailable. Please try again later.", 503);

  try {
    if (await isRateLimited(redis, getIp(request))) {
      return errorResponse("Too many attempts. Please try again later.", 429);
    }
  } catch {
    console.error("[newsletter] rate limiting unavailable");
    return errorResponse("Signup is temporarily unavailable. Please try again later.", 503);
  }

  const result = await subscribeToMailerLite(data.email);
  if (!result.ok) {
    const message =
      result.reason === "rejected" ? "Please enter a valid email address." : "Signup is temporarily unavailable. Please try again later.";
    return errorResponse(message, result.reason === "rejected" ? 400 : 502);
  }

  return NextResponse.json({ ok: true, alreadySubscribed: result.alreadySubscribed, needsConfirmation: result.needsConfirmation });
}

export async function GET() {
  return errorResponse("Method not allowed.", 405);
}
