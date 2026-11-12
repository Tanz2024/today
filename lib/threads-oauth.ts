import "server-only";
import crypto from "node:crypto";

export const THREADS_STATE_COOKIE = "brisastory_threads_oauth_state";

export function threadsRedirectUri(request: Request) {
  return process.env.THREADS_REDIRECT_URI?.trim() || new URL("/api/threads/callback", request.url).toString();
}

export function threadsAppId() {
  return process.env.THREADS_APP_ID?.trim() || process.env.META_APP_ID?.trim() || "";
}

export function threadsAppSecret() {
  return process.env.THREADS_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || "";
}

export function threadsScopes() {
  return process.env.THREADS_OAUTH_SCOPES?.trim() || "threads_basic,threads_keyword_search";
}

export function getThreadsAccessToken() {
  const token = process.env.THREADS_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("THREADS_ACCESS_TOKEN is not configured");
  return token;
}

export function createOAuthState() {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const secret = process.env.THREADS_OAUTH_STATE_SECRET?.trim();
  if (!secret) throw new Error("THREADS_OAUTH_STATE_SECRET is not configured");
  const signature = crypto.createHmac("sha256", secret).update(nonce).digest("base64url");
  return `${nonce}.${signature}`;
}

export function verifyOAuthState(value: string | undefined) {
  const secret = process.env.THREADS_OAUTH_STATE_SECRET?.trim();
  if (!secret || !value) return false;
  const [nonce, signature] = value.split(".");
  if (!nonce || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(nonce).digest("base64url");
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
