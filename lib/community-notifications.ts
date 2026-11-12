import "server-only";
import { Resend } from "resend";

export async function notifyCommunity(email: string | undefined, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const inbox = process.env.CONTACT_INBOX;
  if (!email || !apiKey || !inbox) return false;
  try { await new Resend(apiKey).emails.send({ from: "TodayAI Community <hello@brisastory.live>", to: email, subject, text }); return true; } catch { return false; }
}
