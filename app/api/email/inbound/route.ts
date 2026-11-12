import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { editorialEmail } from "@/lib/editorial-email";

export const runtime = "nodejs";

type InboundEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
  };
};

const textEncoder = new TextEncoder();

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function verifySignature(rawBody: string, request: NextRequest): Promise<boolean> {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature")?.split(" ") ?? [];
  if (!secret || !id || !timestamp || !signatures.length) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const [, encodedSecret] = secret.split("_", 2);
  if (!encodedSecret) return false;
  const key = await crypto.subtle.importKey("raw", base64ToBytes(encodedSecret) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(`${id}.${timestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return signatures.some((value) => value === `v1,${expected}`);
}

function getRedis() {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
}

function ignoredSender(sender: string): boolean {
  const email = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  return /^(hello@brisastory\.live|no[-_.]?reply@|noreply@)/i.test(email.trim());
}

function ignoredSubject(subject: string): boolean {
  return /^(auto(matic)? reply|out of office|ooo|vacation|delivery status|mail delivery)/i.test(subject.trim());
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!(await verifySignature(rawBody, request))) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  let event: InboundEvent;
  try { event = JSON.parse(rawBody) as InboundEvent; } catch { return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 }); }
  if (event.type !== "email.received") return NextResponse.json({ ok: true, ignored: true });

  const emailId = event.data?.email_id;
  const sender = event.data?.from ?? "";
  const subject = event.data?.subject?.trim() || "your message";
  if (!emailId || !sender) return NextResponse.json({ error: "Incomplete webhook payload" }, { status: 400 });
  if (ignoredSender(sender) || ignoredSubject(subject)) return NextResponse.json({ ok: true, ignored: true });

  const redis = getRedis();
  if (redis) {
    const inserted = await redis.set(`resend:inbound:replied:${emailId}`, "1", { nx: true, ex: 60 * 60 * 24 * 30 });
    if (inserted === null) return NextResponse.json({ ok: true, duplicate: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.CONTACT_INBOX;
  if (!apiKey || !inbox) {
    console.error("[email-inbound] missing email configuration");
    return NextResponse.json({ error: "Email service unavailable" }, { status: 503 });
  }

  try {
    const resend = new Resend(apiKey);
    const received = await resend.emails.receiving.get(emailId);
    if (received.error || !received.data) throw new Error("received email lookup failed");
    const email = received.data as { from?: string; subject?: string; text?: string; html?: string };
    const originalSubject = email.subject || subject;
    const originalText = email.text || "(Message body unavailable; view the received email in Resend.)";
    await resend.emails.send({
      from: "TodayAI <hello@brisastory.live>",
      to: inbox,
      replyTo: sender,
      subject: originalSubject.startsWith("Fwd:") ? originalSubject : `Fwd: ${originalSubject}`,
      text: `Original sender: ${email.from || sender}\nOriginal subject: ${originalSubject}\n\n${originalText}`,
    });
    const reply = editorialEmail({
      title: "Correspondence received",
      greeting: "Hi,",
      paragraphs: ["Thanks for writing to TodayAI.", "Your email has reached us safely. If it calls for a reply, someone from our team will respond.", "In the meantime, you can see what’s fresh at TodayAI."],
      subject: originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`,
    });
    await resend.emails.send({
      from: "TodayAI <hello@brisastory.live>",
      to: sender.match(/<([^>]+)>/)?.[1] ?? sender,
      replyTo: inbox,
      subject: reply.subject,
      text: reply.text,
      html: reply.html,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[email-inbound] processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Email processing failed" }, { status: 502 });
  }
}

export async function GET() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
