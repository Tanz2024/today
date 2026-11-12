import { z } from "zod";
import { createHash } from "node:crypto";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HEADER_BREAK = /[\r\n]/;
const WORDS = /\S+/g;

export function wordCount(value: string) { return value.match(WORDS)?.length ?? 0; }

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000).refine((value) => wordCount(value) <= 250, "Message must be 250 words or fewer"),
  website: z.string().max(0).optional().default(""),
  startedAt: z.coerce.number().int().positive(),
  turnstileToken: z.string().max(4096).optional().default(""),
}).strict();

export function hasUnsafeText(value: string) {
  return CONTROL_CHARS.test(value) || HEADER_BREAK.test(value);
}

export function abuseHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isHoneypotTriggered(value: string) { return value.trim().length > 0; }
export function isTooFast(startedAt: number, now = Date.now(), minimumMs = 2500) {
  const elapsed = now - startedAt;
  return elapsed < minimumMs || elapsed > 24 * 60 * 60 * 1000;
}
export function isAllowedOrigin(origin: string | null, referer: string | null, isProduction: boolean) {
  if (!isProduction) return true;
  const candidate = origin || referer;
  if (!candidate) return false;
  try { const url = new URL(candidate); return url.protocol === "https:" && url.hostname === "brisastory.live"; } catch { return false; }
}
