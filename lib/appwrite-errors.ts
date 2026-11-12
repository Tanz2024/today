const warnedSubsystems = new Set<string>();

export function isAppwriteDatabaseReadQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, unknown>;
  let type = candidate.type ?? candidate.errorType ?? candidate.codeName;
  let status = candidate.code ?? candidate.status ?? candidate.statusCode;
  if (!type && typeof candidate.response === "string") {
    try {
      const response = JSON.parse(candidate.response) as Record<string, unknown>;
      type = response.type;
      status ??= response.code ?? response.status ?? response.statusCode;
    } catch { /* not a structured Appwrite response */ }
  }
  return type === "limit_databases_reads_exceeded" && (status === 402 || status === "402");
}

// Appwrite projects can be paused after inactivity. Read-only editorial
// surfaces should fall back to local MDX/content in the same way they do when
// the database read quota is unavailable.
export function isAppwriteDatabaseUnavailable(error: unknown): boolean {
  if (isAppwriteDatabaseReadQuotaError(error)) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, unknown>;
  let type = candidate.type ?? candidate.errorType ?? candidate.codeName;
  let status = candidate.code ?? candidate.status ?? candidate.statusCode;
  if (!type && typeof candidate.response === "string") {
    try {
      const response = JSON.parse(candidate.response) as Record<string, unknown>;
      type = response.type;
      status ??= response.code ?? response.status ?? response.statusCode;
    } catch { /* not a structured Appwrite response */ }
  }
  return type === "project_paused" && (status === 403 || status === "403");
}

export function warnAppwriteQuotaUnavailable(subsystem: string) {
  if (warnedSubsystems.has(subsystem)) return;
  warnedSubsystems.add(subsystem);
  console.warn(`[brisastory] ${subsystem}: Appwrite database-read quota unavailable (limit_databases_reads_exceeded)`);
}
