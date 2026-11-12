export class CronFetchTimeoutError extends Error {
  constructor(url, timeoutMs) { super(`Cron request timed out after ${timeoutMs}ms`); this.name = "CronFetchTimeoutError"; this.url = url; this.timeoutMs = timeoutMs; }
}
export async function cronFetch(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const parent = options.signal;
  const forward = () => controller.abort(parent?.reason);
  if (parent?.aborted) controller.abort(parent.reason); else parent?.addEventListener("abort", forward, { once: true });
  const timer = setTimeout(() => controller.abort(new CronFetchTimeoutError(String(url), timeoutMs)), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  catch (error) { if (controller.signal.reason instanceof CronFetchTimeoutError) throw controller.signal.reason; throw error; }
  finally { clearTimeout(timer); parent?.removeEventListener("abort", forward); }
}
export function isCronFetchTimeout(error) { return error instanceof CronFetchTimeoutError || error?.name === "TimeoutError"; }
