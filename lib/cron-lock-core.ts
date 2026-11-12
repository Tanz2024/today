export const DEFAULT_CRON_LEASE_MS = 7 * 60 * 1000;

export type CronLeaseState = { invocationId: string; expiresAt: string; status: "active" | "completed" | "failed" };

export function leaseIsActive(lease: Partial<CronLeaseState> | undefined, now: number) {
  const expiresAt = Date.parse(String(lease?.expiresAt ?? ""));
  return lease?.status === "active" && Number.isFinite(expiresAt) && expiresAt > now;
}

export function leaseCanBeRecovered(lease: Partial<CronLeaseState> | undefined, now: number) {
  return !leaseIsActive(lease, now);
}
