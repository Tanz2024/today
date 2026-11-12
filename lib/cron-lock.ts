import { AppwriteException, type Databases } from "node-appwrite";
import { APPWRITE_DATABASE_ID, getDatabases, toDocumentId } from "@/lib/appwrite";
import { DEFAULT_CRON_LEASE_MS, leaseIsActive } from "@/lib/cron-lock-core";

export const CRON_LOCKS_COLLECTION_ID = process.env.APPWRITE_CRON_LOCKS_COLLECTION_ID ?? "cron_locks";
export { DEFAULT_CRON_LEASE_MS } from "@/lib/cron-lock-core";

export type CronLease = {
  jobName: string;
  invocationId: string;
  acquiredAt: string;
  expiresAt: string;
  status: "active" | "completed" | "failed";
};

export type CronLockResult =
  | { acquired: true; lease: CronLease; release: (status?: "completed" | "failed") => Promise<void> }
  | { acquired: false; reason: "already-running" | "unavailable" };

export function createInvocationId(jobName: string, now = Date.now()) {
  return `${jobName}-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

function leaseData(lease: CronLease) {
  return { ...lease, acquiredAt: lease.acquiredAt, expiresAt: lease.expiresAt };
}

function isConflict(error: unknown) {
  return error instanceof AppwriteException && (error.code === 409 || error.type === "document_already_exists");
}

export async function acquireCronLease(
  jobName: string,
  options: { databases?: Databases | null; now?: number; leaseMs?: number; invocationId?: string } = {},
): Promise<CronLockResult> {
  const databases = options.databases === undefined ? getDatabases() : options.databases;
  if (!databases || !APPWRITE_DATABASE_ID || !CRON_LOCKS_COLLECTION_ID) return { acquired: false, reason: "unavailable" };

  const now = options.now ?? Date.now();
  const invocationId = options.invocationId ?? createInvocationId(jobName, now);
  const lease: CronLease = {
    jobName,
    invocationId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (options.leaseMs ?? DEFAULT_CRON_LEASE_MS)).toISOString(),
    status: "active",
  };
  const documentId = toDocumentId(`cron-${jobName}`);

  try {
    await databases.createDocument(APPWRITE_DATABASE_ID, CRON_LOCKS_COLLECTION_ID, documentId, leaseData(lease));
  } catch (error) {
    if (!isConflict(error)) return { acquired: false, reason: "unavailable" };
    // Recovery must be read+update+commit in one Appwrite transaction. Two
    // workers may observe the same expired lease, but only one transaction can
    // commit the replacement; the loser is treated as already running.
    try {
      const transaction = await databases.createTransaction(30);
      const current = await databases.getDocument(APPWRITE_DATABASE_ID, CRON_LOCKS_COLLECTION_ID, documentId, [], transaction.$id) as unknown as Partial<CronLease>;
      if (leaseIsActive(current, now)) {
        await databases.updateTransaction(transaction.$id, false, true);
        return { acquired: false, reason: "already-running" };
      }
      await databases.updateDocument(APPWRITE_DATABASE_ID, CRON_LOCKS_COLLECTION_ID, documentId, leaseData(lease), [], transaction.$id);
      await databases.updateTransaction(transaction.$id, true, false);
    } catch (recoveryError) {
      return { acquired: false, reason: isConflict(recoveryError) ? "already-running" : "unavailable" };
    }
  }

  return {
    acquired: true,
    lease,
    release: async (status = "completed") => {
      try {
        const current = await databases.getDocument(APPWRITE_DATABASE_ID, CRON_LOCKS_COLLECTION_ID, documentId) as unknown as Partial<CronLease>;
        if (current.invocationId !== invocationId) return;
        await databases.updateDocument(APPWRITE_DATABASE_ID, CRON_LOCKS_COLLECTION_ID, documentId, { ...leaseData(lease), status });
      } catch (error) {
        console.error("[cron-lock] release failed", error instanceof Error ? error.message : "unknown error");
      }
    },
  };
}
