import "server-only";
import crypto from "node:crypto";

// Cookie name kept so the existing moderator flow keeps working.
const COOKIE = "brisastory_moderator";
/** Moderator sessions last one working day (was 30 days). */
export const MODERATOR_SESSION_SECONDS = 60 * 60 * 8;

const password = () => process.env.EDITORIAL_MODERATOR_PASSWORD ?? "";
// Optional dedicated signing key; falls back to the password as before.
const signingKey = () => process.env.EDITORIAL_SESSION_SECRET || password();

export const moderatorCookieName = COOKIE;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest();
}

/** Constant-time password check (hashing first makes lengths equal). */
export function isModeratorPasswordValid(candidate: unknown) {
  const expected = password();
  if (!expected || typeof candidate !== "string" || candidate.length > 512) return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

export function createModeratorToken() {
  const value = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`;
  return `${value}.${crypto.createHmac("sha256", signingKey()).update(value).digest("hex")}`;
}

export function isModeratorTokenValid(token: string | undefined) {
  if (!token || !signingKey()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [timestamp, nonce, signature] = parts;
  // Reject malformed input before timingSafeEqual, which throws on unequal lengths.
  if (!/^\d{10,16}$/.test(timestamp) || !/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const issuedAt = Number(timestamp);
  const now = Date.now();
  if (issuedAt > now + 60_000 || issuedAt < now - MODERATOR_SESSION_SECONDS * 1000) return false;
  const expected = crypto.createHmac("sha256", signingKey()).update(`${timestamp}.${nonce}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
