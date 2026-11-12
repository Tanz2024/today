import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { abuseHash, contactSchema, hasUnsafeText, isAllowedOrigin, isHoneypotTriggered, isTooFast } from "@/lib/contact-security";
import { editorialEmail } from "@/lib/editorial-email";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 12_000;

const errorResponse = (message: string, status: number) => NextResponse.json({ error: message }, { status });
const getIp = (request: NextRequest) => request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

function getRedis() {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
}

async function checkAbuse(redis: Redis, ip: string, email: string, message: string) {
  const identifier = abuseHash(ip);
  const short = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "10 m"), prefix: "contact:ip" });
  const daily = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 d"), prefix: "contact:daily" });
  const [shortResult, dailyResult] = await Promise.all([short.limit(identifier), daily.limit(identifier)]);
  if (!shortResult.success || !dailyResult.success) return "limit";
  const inserted = await redis.set(`contact:duplicate:${abuseHash(`${ip}|${email}|${message}`)}`, "1", { nx: true, ex: 600 });
  return inserted === null ? "duplicate" : "ok";
}

async function verifyTurnstile(token: string, request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ secret, response: token, remoteip: getIp(request) }) });
    const result = await response.json() as { success?: boolean };
    return response.ok && result.success === true;
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"), process.env.NODE_ENV === "production")) return errorResponse("Unable to process this request.", 403);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return errorResponse("Unable to process this request.", 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return errorResponse("Unable to process this request.", 413);
    body = JSON.parse(raw);
  } catch { return errorResponse("Please submit the form again.", 400); }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Please check your details and try again.", 400);
  const data = parsed.data;
  if (isHoneypotTriggered(data.website)) return NextResponse.json({ ok: true });
  if ([data.name, data.email, data.subject, data.message].some(hasUnsafeText)) return errorResponse("Please check your details and try again.", 400);
  if (isTooFast(data.startedAt)) return errorResponse("Please take a moment and try again.", 400);
  if (!(await verifyTurnstile(data.turnstileToken, request))) return errorResponse("Unable to verify this request.", 400);
  const redis = getRedis();
  if (!redis) return errorResponse("Contact service is temporarily unavailable.", 503);
  try {
    const abuseResult = await checkAbuse(redis, getIp(request), data.email, data.message);
    if (abuseResult === "duplicate") return errorResponse("Please wait before sending the same message again.", 429);
    if (abuseResult === "limit") return errorResponse("Too many messages. Please try again later.", 429);
  } catch { console.error("[contact] abuse protection unavailable"); return errorResponse("Contact service is temporarily unavailable.", 503); }
  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.CONTACT_INBOX;
  if (!apiKey || !inbox) return errorResponse("Contact service is temporarily unavailable.", 503);
  const resend = new Resend(apiKey);
  const timestamp = new Date().toISOString();
  try {
    const result = await resend.emails.send({ from: "BrisaStory <hello@brisastory.live>", to: inbox, replyTo: data.email, subject: `[BrisaStory contact] ${data.subject}`, text: `Name: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\nTimestamp: ${timestamp}\n\n${data.message}` });
    if (result.error) throw new Error("delivery failed");
  } catch { console.error("[contact] message delivery failed"); return errorResponse("We could not send your message. Please try again.", 502); }

  let confirmationSent = true;
  try {
    const firstName = data.name.trim().split(/\s+/)[0] || "there";
    const confirmation = editorialEmail({
      title: "Message received",
      greeting: `Hi ${firstName},`,
      paragraphs: ["Thanks for writing to BrisaStory.", "Your note is safely in our inbox. If it calls for a reply, someone from our team will get back to you.", "Until then, there’s always something fresh waiting at BrisaStory."],
      subject: "We received your message — BrisaStory",
    });
    const result = await resend.emails.send({
      from: "BrisaStory <hello@brisastory.live>",
      to: data.email,
      replyTo: inbox,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    });
    if (result.error) confirmationSent = false;
  } catch {
    confirmationSent = false;
  }
  if (!confirmationSent) console.error("[contact] confirmation email failed after admin message was accepted");
  return NextResponse.json({ ok: true, success: true, confirmationSent });
}

export async function GET() { return errorResponse("Method not allowed.", 405); }
