export const HOBBY_FUNCTION_MAX_MS = 300_000;
export const DEFAULT_EXECUTION_BUDGET_MS = 240_000;
export const DEFAULT_SAFE_REMAINING_MS = 15_000;

/** @param {{maxMs?: number, safeRemainingMs?: number, now?: () => number, onExhausted?: (details: Record<string, unknown>) => void}} [options] */
export function createExecutionBudget({ maxMs = DEFAULT_EXECUTION_BUDGET_MS, safeRemainingMs = DEFAULT_SAFE_REMAINING_MS, now = () => Date.now(), onExhausted } = {}) {
  const startedAt = now();
  let exhaustedLogged = false;
  function elapsedMs() { return Math.max(0, now() - startedAt); }
  function remainingMs() { return Math.max(0, maxMs - elapsedMs()); }
  function exhausted() { return remainingMs() <= safeRemainingMs; }
  function canStart(estimatedMs = safeRemainingMs) { return remainingMs() > Math.max(safeRemainingMs, estimatedMs); }
  function checkpoint(phase, details = {}) {
    if (!exhausted()) return true;
    if (!exhaustedLogged) {
      exhaustedLogged = true;
      onExhausted?.({ phase, elapsedMs: elapsedMs(), remainingMs: remainingMs(), ...details });
    }
    return false;
  }
  return { startedAt, maxMs, elapsedMs, remainingMs, exhausted, canStart, checkpoint };
}
