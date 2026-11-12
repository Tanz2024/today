// Bounded network access for server rendering and static generation.
//
// Why this exists: `next build` prerenders routes that call third-party APIs
// (RAWG, Spotify, AniList, Pexels...). A plain `fetch` has no deadline, so an
// upstream that accepts the TCP connection but never answers — e.g. RAWG
// returning Cloudflare 522 after ~40s — blocks a prerender worker and makes the
// build look stalled (observed at 156/208). Every outbound request made during
// rendering should go through this helper so that:
//   1. each request has a hard deadline,
//   2. a provider that is clearly down is skipped for a short cool-down instead
//      of costing a full timeout on every route (circuit breaker), and
//   3. failures are logged in production builds too, with the provider name,
//      so the cause is visible in build output instead of silently empty pages.

export type BoundedFetchOptions = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
  /** Provider label used in logs and for the circuit breaker, e.g. "RAWG". */
  provider: string;
  /** Hard deadline for the request in milliseconds. */
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 8_000;
const FAILURE_THRESHOLD = 2;
const COOL_DOWN_MS = 5 * 60_000;

type BreakerState = { failures: number; openUntil: number };
const breakers = new Map<string, BreakerState>();

export class UpstreamUnavailableError extends Error {
  readonly provider: string;
  readonly reason: string;

  constructor(provider: string, reason: string) {
    super(`[${provider}] upstream unavailable: ${reason}`);
    this.provider = provider;
    this.reason = reason;
    this.name = "UpstreamUnavailableError";
  }
}

function breakerFor(provider: string) {
  let state = breakers.get(provider);
  if (!state) {
    state = { failures: 0, openUntil: 0 };
    breakers.set(provider, state);
  }
  return state;
}

export function isCircuitOpen(provider: string, now = Date.now()) {
  return breakerFor(provider).openUntil > now;
}

function recordFailure(provider: string, reason: string, now = Date.now()) {
  const state = breakerFor(provider);
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD && state.openUntil <= now) {
    state.openUntil = now + COOL_DOWN_MS;
    console.warn(`[${provider}] ${state.failures} consecutive failures (${reason}); skipping requests for ${COOL_DOWN_MS / 1000}s`);
  }
}

function recordSuccess(provider: string) {
  const state = breakerFor(provider);
  state.failures = 0;
  state.openUntil = 0;
}

/** Test hook: reset breaker state between cases. */
export function resetBoundedFetchState() {
  breakers.clear();
}

/**
 * fetch() with a deadline and a per-provider circuit breaker.
 * Resolves with the Response for any HTTP status (callers keep their own
 * `response.ok` handling); 5xx responses count toward the breaker.
 * Rejects with UpstreamUnavailableError on timeout, network error or open circuit.
 */
export async function boundedFetch(input: string | URL, options: BoundedFetchOptions): Promise<Response> {
  const { provider, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init } = options;
  if (isCircuitOpen(provider)) throw new UpstreamUnavailableError(provider, "circuit open after repeated failures");

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  try {
    const response = await fetch(input, { ...init, signal: combined });
    if (response.status >= 500) {
      console.warn(`[${provider}] HTTP ${response.status}`);
      recordFailure(provider, `HTTP ${response.status}`);
    } else {
      recordSuccess(provider);
    }
    return response;
  } catch (error) {
    const reason = timeoutSignal.aborted ? `timed out after ${timeoutMs}ms` : error instanceof Error ? error.message : String(error);
    console.warn(`[${provider}] request failed: ${reason}`);
    recordFailure(provider, reason);
    throw new UpstreamUnavailableError(provider, reason);
  }
}
