import { NextResponse, type NextRequest } from "next/server";
// Static data only (no shared runtime modules), so Proxy stays self-contained.
import retiredArticles from "./lib/retired-articles.json";

// Sections retired when TodayAI became AI-only. They have no equivalent
// page, so they answer 410 Gone (not a redirect to the homepage). Retired
// hubs that do have an equivalent are 308-redirected in next.config.ts.
const GONE_PREFIXES = [
  "/music", "/metro", "/pulse", "/daily-drop", "/what-if", "/questions", "/saved", "/gaming", "/community",
  "/play/obby", "/play/rush", "/play/breaker", "/play/trivia", "/play/would-you-rather", "/play/red-flag-green-flag",
  "/play/group-chat", "/play/weekend-picker", "/play/stay-out", "/play/what-to-play", "/play/multiplayer", "/play/gaming-culture",
  "/tools/attendance-calculator", "/tools/bill-splitter", "/tools/cgpa-calculator", "/tools/compatibility-check",
  "/tools/date-calculator", "/tools/focus-timer", "/tools/percentage-calculator", "/tools/student-budget-calculator", "/tools/trip-budget-calculator",
];

// Old lifestyle desk landing pages. Only the exact landing URL is gone:
// AI articles that still live under these paths keep working. Retired
// published articles are listed below (410); anything else unknown 404s.
const GONE_EXACT = new Set(["/culture", "/relationships", "/campus", "/money", "/travel", "/style", "/entertainment", "/self-care", "/sex-health", "/meaning", "/food", "/social"]);

// Published non-AI articles retired on purpose. Their MDX sources are kept.
const RETIRED_ARTICLES = new Set<string>(retiredArticles.paths);

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const gone = GONE_EXACT.has(path) || RETIRED_ARTICLES.has(path) || GONE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (!gone) return NextResponse.next();
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page retired · TodayAI</title></head><body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;color:#111114"><h1>This page has been retired</h1><p>TodayAI now focuses on AI news, AI tools, AI games and software comparisons.</p><p><a href="/">Go to TodayAI</a> · <a href="/search">Search</a></p></body></html>`,
    { status: 410, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } },
  );
}

export const config = {
  matcher: [
    "/(music|metro|pulse|daily-drop|what-if|questions|saved|gaming|community)/:path*",
    "/(music|metro|pulse|daily-drop|what-if|questions|saved|gaming|community)",
    "/play/:path+",
    "/tools/:path+",
    "/(culture|relationships|campus|money|travel|style|entertainment|self-care|sex-health|meaning|food|social)",
    "/(culture|relationships|campus|money|travel|style|entertainment|self-care|sex-health|gaming)/:slug",
  ],
};
