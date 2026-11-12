export const MAX_REASON_LENGTH = 280;

export type ReasonValidation = { ok: true; reason: string } | { ok: false; error: string };

const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|me|ly|site|link)\b)/i;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
const CONTACT_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/;

export function validateQuestionReason(value: unknown): ReasonValidation {
  if (typeof value !== "string") return { ok: false, error: "Please enter a reason." };
  const reason = value.trim();
  if (!reason) return { ok: false, error: "Please enter a reason." };
  if (reason.length > MAX_REASON_LENGTH) return { ok: false, error: `Reasons must be ${MAX_REASON_LENGTH} characters or fewer.` };
  if (URL_PATTERN.test(reason)) return { ok: false, error: "Links are not allowed." };
  if (EMAIL_PATTERN.test(reason)) return { ok: false, error: "Email addresses are not allowed." };
  if (CONTACT_PATTERN.test(reason)) return { ok: false, error: "Phone numbers and contact details are not allowed." };
  return { ok: true, reason };
}
