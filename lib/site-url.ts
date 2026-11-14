// Central public-URL configuration. Every canonical, Open Graph, sitemap and
// server-generated public URL, and every same-origin check, reads from here.
//
// Set NEXT_PUBLIC_SITE_URL to TodayAI's production origin (e.g.
// https://example.com). If it is unset, production keeps the previously
// deployed origin so existing canonicals don't silently break; that fallback
// is NOT a decision that it is the right domain.
// Extra trusted origins (e.g. a www alias or staging) go in
// ALLOWED_ORIGINS as a comma-separated list of full origins.

const LEGACY_FALLBACK_URL = "https://brisastory.live";
const DEV_FALLBACK_URL = "http://localhost:3000";

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const SITE_URL: string =
  normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? (isProduction ? LEGACY_FALLBACK_URL : DEV_FALLBACK_URL);

/** True when NEXT_PUBLIC_SITE_URL is explicitly configured. */
export const SITE_URL_CONFIGURED = Boolean(normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL));

export const SITE_HOSTNAME = new URL(SITE_URL).hostname;

/**
 * Explicit allowlist of origins that may call same-site POST endpoints.
 * Never derived from the request itself. Production accepts only https
 * origins; development additionally accepts localhost.
 */
export function getAllowedOrigins(production = isProduction): Set<string> {
  const origins = new Set<string>();
  const add = (value: string | null) => {
    if (!value) return;
    if (production && !value.startsWith("https://")) return;
    origins.add(value);
  };
  add(SITE_URL);
  for (const entry of (process.env.ALLOWED_ORIGINS ?? "").split(",")) add(normalizeOrigin(entry));
  if (!production) {
    for (const port of ["3000", "3001"]) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }
  return origins;
}

/** Same-origin check for POST endpoints using Origin, then Referer. */
export function isTrustedOrigin(origin: string | null, referer: string | null, production = isProduction): boolean {
  const candidate = normalizeOrigin(origin) ?? normalizeOrigin(referer);
  if (!candidate) return !production; // no header: only tolerated in development
  return getAllowedOrigins(production).has(candidate);
}
