import { NextResponse } from "next/server";
import { createOAuthState, threadsAppId, threadsRedirectUri, threadsScopes, THREADS_STATE_COOKIE } from "@/lib/threads-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = threadsAppId();
  if (!clientId || !process.env.THREADS_APP_SECRET?.trim() && !process.env.META_APP_SECRET?.trim()) {
    return new NextResponse("Threads OAuth is not configured.", { status: 503 });
  }
  try {
    const state = createOAuthState();
    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", threadsRedirectUri(request));
    url.searchParams.set("scope", threadsScopes());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    const response = NextResponse.redirect(url);
    response.cookies.set(THREADS_STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
    return response;
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Threads OAuth is not configured.", { status: 503 });
  }
}
