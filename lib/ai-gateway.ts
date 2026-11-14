// Shared server-side gateway for every TodayAI feature that calls a hosted
// language model (OpenRouter). One place for: the on/off switch, origin
// checks, body limits, per-visitor rate limits, the global daily budget,
// timeouts and provider errors. Never returns canned output.

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { abuseHash, isAllowedOrigin } from "@/lib/contact-security";
import { getAiUtilitiesGlobalDailyLimit, isAiUtilitiesEnabled } from "@/lib/ai-utilities";

const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * Free models only. OpenRouter bills $0 for "openrouter/free" (its router
 * across free models) and for model ids ending in ":free". Any other
 * configured model is ignored, so a paid model can never be called.
 */
export const FREE_MODEL_FALLBACK = "openrouter/free";
export function freeModel() {
  const configured = process.env.AI_UTILITIES_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim() || "";
  return configured === FREE_MODEL_FALLBACK || configured.endsWith(":free") ? configured : FREE_MODEL_FALLBACK;
}

export const aiFail = (error: string, status: number, code?: string) => NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });

const getIp = (request: NextRequest) => request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

function getRedis() {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
}

export type AiGuard = { ok: true; redis: Redis | null } | { ok: false; response: NextResponse };

/** Switch, origin, size and per-visitor limits. Call before parsing the body. */
export async function guardAiRequest(request: NextRequest, { maxBodyBytes, prefix = "ai-utility" }: { maxBodyBytes: number; prefix?: string }): Promise<AiGuard> {
  if (!isAiUtilitiesEnabled()) return { ok: false, response: aiFail("This AI tool is not available right now.", 503, "unavailable") };
  const production = process.env.NODE_ENV === "production";
  if (!isAllowedOrigin(request.headers.get("origin"), request.headers.get("referer"), production)) return { ok: false, response: aiFail("Unable to process this request.", 403) };
  if (Number(request.headers.get("content-length") ?? 0) > maxBodyBytes) return { ok: false, response: aiFail("That input is too long.", 413) };

  // Rate limits are mandatory in production: without Redis we refuse rather
  // than expose an unmetered model endpoint.
  const redis = getRedis();
  if (!redis && production) return { ok: false, response: aiFail("This AI tool is not available right now.", 503, "unavailable") };
  if (redis) {
    const id = abuseHash(getIp(request));
    // Shared buckets across all AI features, so a visitor can't multiply
    // their allowance by switching tools.
    const burst = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: `${prefix}:burst` });
    const daily = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(40, "1 d"), prefix: `${prefix}:daily` });
    const [a, b] = await Promise.all([burst.limit(id), daily.limit(id)]);
    if (!a.success || !b.success) return { ok: false, response: aiFail("You've reached the limit for now. Please try again later.", 429, "rate_limited") };
  }
  return { ok: true, redis };
}

/** Global spending guard: one counter per UTC day for all AI features. */
export async function consumeGlobalBudget(redis: Redis | null): Promise<NextResponse | null> {
  if (!redis) return null;
  const key = `ai-utility:global:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 60 * 60 * 26);
  if (used > getAiUtilitiesGlobalDailyLimit()) return aiFail("TodayAI's AI tools have reached today's capacity. Please try again tomorrow.", 503, "global_limit");
  return null;
}

/** One chat completion. Returns the model text or an error response. */
export async function callLanguageModel({ system, user, maxTokens = 900, temperature = 0.3 }: { system: string; user: string; maxTokens?: number; temperature?: number }): Promise<{ output: string } | { response: NextResponse }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!.trim()}`, "Content-Type": "application/json", "X-Title": "TodayAI" },
      body: JSON.stringify({
        model: freeModel(),
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!response.ok) return { response: aiFail("The AI service could not complete this request. Please try again.", 502, "provider_error") };
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const output = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (!output) return { response: aiFail("The AI service returned an empty response. Please try again.", 502, "provider_error") };
    return { output };
  } catch {
    return { response: aiFail("The AI service took too long to respond. Please try again.", 504, "timeout") };
  } finally {
    clearTimeout(timer);
  }
}
