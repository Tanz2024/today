import { createHash, createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

// Anonymous, non-reversible identity for rate-limiting reactions/votes per
// visitor without storing raw IPs. Falls back to null (no enforcement) if
// INTERACTION_HASH_SECRET isn't configured.
export function getVisitorId(req: NextRequest): string | null {
  const secret = process.env.INTERACTION_HASH_SECRET;
  if (!secret) return null;

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  return createHmac("sha256", secret).update(`${ip}::${ua}`).digest("hex");
}

// Appwrite custom document IDs are capped at 36 chars, so combine the
// visitor id with a per-feature key (slug/poll id) into a short, collision-safe hash.
export function lockDocumentId(visitorId: string, key: string): string {
  return createHash("sha256").update(`${visitorId}:${key}`).digest("hex").slice(0, 36);
}
