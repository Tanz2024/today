import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { threadsAppId, threadsAppSecret, threadsRedirectUri, verifyOAuthState, THREADS_STATE_COOKIE } from "@/lib/threads-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function result(request: NextRequest, status: "success" | "error", message: string) {
  const url = new URL("/api/threads/callback", request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(THREADS_STATE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}

function statesMatch(queryState: string | undefined, cookieState: string | undefined) {
  if (!queryState || !cookieState || queryState.length !== cookieState.length) return false;
  return crypto.timingSafeEqual(Buffer.from(queryState), Buffer.from(cookieState));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const completedStatus = params.get("status");
  if (completedStatus === "success" || completedStatus === "error") {
    const title = completedStatus === "success" ? "Threads connected" : "Threads connection failed";
    const message = params.get("message") || "";
    return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:3rem;line-height:1.5"><h1>${title}</h1><p>${message.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character))}</p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const queryState = params.get("state") ?? undefined;
  const cookieState = request.cookies.get(THREADS_STATE_COOKIE)?.value;
  const matched = statesMatch(queryState, cookieState) && verifyOAuthState(queryState);
  console.info("[threads/oauth] state validation", { stateQueryPresent: Boolean(queryState), stateCookiePresent: Boolean(cookieState), hostname: request.nextUrl.hostname, cookiePath: "/", matched });
  if (params.get("error")) return clearStateCookie(result(request, "error", params.get("error_description") || "Threads authorization was declined."));
  if (!matched) return clearStateCookie(result(request, "error", "The Threads authorization session expired or was invalid."));
  const code = params.get("code");
  const clientId = threadsAppId();
  const clientSecret = threadsAppSecret();
  if (!code || !clientId || !clientSecret) return clearStateCookie(result(request, "error", "Threads OAuth is not configured."));

  try {
    const response = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: threadsRedirectUri(request) }),
      cache: "no-store",
    });
    if (!response.ok) return clearStateCookie(result(request, "error", "Threads token exchange failed."));
    const token = await response.json() as { access_token?: string; user_id?: string };
    if (!token.access_token) return clearStateCookie(result(request, "error", "Threads returned no access token."));
    // Deliberately do not persist or return the token yet. The trend reader
    // can consume this server-side in a later, separately reviewed change.
    const success = result(request, "success", "Threads authorization succeeded. Add the server-side access token as THREADS_ACCESS_TOKEN before using keyword search.");
    return clearStateCookie(success);
  } catch {
    return clearStateCookie(result(request, "error", "Unable to contact Threads securely."));
  }
}
