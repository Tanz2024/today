import "server-only";
import crypto from "node:crypto";

const COOKIE = "brisastory_moderator";
const secret = () => process.env.EDITORIAL_MODERATOR_PASSWORD ?? "";
export const moderatorCookieName = COOKIE;
export function createModeratorToken() { const value = `${Date.now()}.${crypto.randomBytes(16).toString("hex")}`; return `${value}.${crypto.createHmac("sha256", secret()).update(value).digest("hex")}`; }
export function isModeratorTokenValid(token: string | undefined) { if (!token || !secret()) return false; const parts = token.split("."); if (parts.length !== 3) return false; const [timestamp, nonce, signature] = parts; const value = `${timestamp}.${nonce}`; const expected = crypto.createHmac("sha256", secret()).update(value).digest("hex"); return Number(timestamp) > Date.now() - 1000 * 60 * 60 * 24 * 30 && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
