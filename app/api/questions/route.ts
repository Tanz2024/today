import { NextRequest, NextResponse } from "next/server";
import { submitQuestion } from "@/lib/question-submissions";
import { getVisitorId } from "@/lib/identity";
import { Resend } from "resend";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, topic, email, confirmed } = (body ?? {}) as {
    text?: unknown;
    topic?: unknown;
    email?: unknown;
    confirmed?: unknown;
  };

  if (confirmed !== true) {
    return NextResponse.json(
      { error: "Please confirm your question doesn't include identifying information." },
      { status: 400 }
    );
  }

  if (typeof text !== "string") {
    return NextResponse.json({ error: "Missing question text" }, { status: 400 });
  }

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (normalizedEmail && (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail))) {
    return NextResponse.json({ error: "Please enter a valid email address or leave it blank." }, { status: 400 });
  }

  const visitorId = getVisitorId(req);
  if (!visitorId) {
    return NextResponse.json({ error: "Submissions are temporarily unavailable." }, { status: 503 });
  }

  const result = await submitQuestion(visitorId, text, typeof topic === "string" ? topic : undefined);

  if (!result.ok) {
    const status = result.error === "rate-limited" ? 429 : result.error === "invalid" ? 400 : 503;
    const message =
      result.error === "rate-limited"
        ? "You've reached today's submission limit — try again tomorrow."
        : result.error === "invalid"
          ? "Your question needs to be between 1 and 800 characters."
          : "Submissions are temporarily unavailable — please try again later.";
    return NextResponse.json({ error: message }, { status });
  }

  const inbox = process.env.CONTACT_INBOX;
  const resendKey = process.env.RESEND_API_KEY;
  if (inbox && resendKey) {
    const resend = new Resend(resendKey);
    const timestamp = new Date().toISOString();
    const safeText = text.trim().slice(0, 800);
    const safeTopic = typeof topic === "string" ? topic.trim().slice(0, 80) : "";
    try {
      await resend.emails.send({
        from: "BrisaStory <hello@brisastory.live>",
        to: inbox,
        replyTo: normalizedEmail || undefined,
        subject: `[BrisaStory question]${safeTopic ? ` ${safeTopic}` : " New anonymous question"}`,
        text: `New anonymous question\n\nQuestion: ${safeText}\nTopic: ${safeTopic || "None"}\nReply email: ${normalizedEmail || "Not provided"}\nTimestamp: ${timestamp}`,
      });

      if (normalizedEmail) {
        const firstName = "there";
        await resend.emails.send({
          from: "BrisaStory <hello@brisastory.live>",
          to: normalizedEmail,
          replyTo: inbox,
          subject: "We received your question ✨",
          text: `Hi ${firstName},\n\nThanks for sending your question to BrisaStory. It has been received and will be reviewed before anything appears publicly.\n\n— BrisaStory\nReal People. Brighter Days.`,
          html: `<div style="background:#f7f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#171719"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5eb;padding:32px"><p style="color:#6757c5;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">BRISASTORY</p><h1 style="font-size:28px;line-height:1.15;margin:20px 0 16px">We received your question.</h1><p style="font-size:16px;line-height:1.6">Thanks for sending it in. Your question will be reviewed before anything appears publicly.</p><p style="margin:28px 0"><a href="https://brisastory.live/questions" style="color:#2563eb;font-weight:700">Explore Real Questions →</a></p><p style="font-size:14px;line-height:1.6">— BrisaStory<br>Real People. Brighter Days.</p></div></div>`,
        });
      }
    } catch (error) {
      console.error("[questions] email delivery failed", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ ok: true });
}
