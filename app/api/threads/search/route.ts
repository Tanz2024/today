import { NextRequest, NextResponse } from "next/server";
import { getThreadsAccessToken } from "@/lib/threads-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_TYPES = new Set(["RECENT", "TOP"]);
const SEARCH_MODES = new Set(["KEYWORD", "TAG"]);
const THREADS_FIELDS = "id,text,timestamp,username,permalink,media_type";

function errorResponse(status: number, error: string, code?: string) {
  return NextResponse.json({ ok: false, error, ...(code ? { upstreamCode: code } : {}) }, { status });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keyword = params.get("keyword")?.trim() || "Roblox";
  const searchType = (params.get("search_type")?.trim().toUpperCase() || "RECENT");
  const searchMode = (params.get("search_mode")?.trim().toUpperCase() || "KEYWORD");
  const rawLimit = params.get("limit") || "10";
  const limit = Number(rawLimit);

  if (keyword.length < 1 || keyword.length > 100) return errorResponse(400, "keyword must be between 1 and 100 characters");
  if (!SEARCH_TYPES.has(searchType)) return errorResponse(400, "search_type must be RECENT or TOP");
  if (!SEARCH_MODES.has(searchMode)) return errorResponse(400, "search_mode must be KEYWORD or TAG");
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) return errorResponse(400, "limit must be an integer between 1 and 25");

  let token: string;
  try {
    token = getThreadsAccessToken();
  } catch {
    return errorResponse(503, "Threads access token is not configured");
  }

  const url = new URL("https://graph.threads.net/v1.0/threads/search");
  url.searchParams.set("q", keyword);
  url.searchParams.set("search_type", searchType);
  url.searchParams.set("search_mode", searchMode);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", THREADS_FIELDS);

  try {
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
    const payload = await upstream.json().catch(() => ({})) as { data?: unknown[]; error?: { message?: string; code?: string } };
    if (!upstream.ok) {
      const upstreamCode = payload.error?.code;
      const safeMessage = upstream.status === 401 || upstream.status === 403
        ? "Threads access token is invalid, expired, or missing the required permission"
        : upstream.status === 429
          ? "Threads rate limit reached"
          : "Threads keyword search failed";
      return errorResponse(upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 401 : 502, safeMessage, upstreamCode);
    }
    const results = Array.isArray(payload.data) ? payload.data : [];
    return NextResponse.json({ ok: true, query: { keyword, searchType, searchMode, limit }, count: results.length, results });
  } catch {
    return errorResponse(502, "Unable to contact the Threads API");
  }
}
