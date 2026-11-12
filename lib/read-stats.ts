import { AppwriteException } from "node-appwrite";
import { unstable_cache } from "next/cache";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_READ_STATS_COLLECTION_ID,
  getDatabases,
  toDocumentId,
} from "@/lib/appwrite";
import { deriveReadStats, MIN_READ_SECONDS, MIN_SAMPLE_SIZE_FOR_AVERAGE } from "@/lib/read-tracking";
import { isAppwriteDatabaseUnavailable } from "@/lib/appwrite-errors";

// Reject beacons outside a plausible single-session reading window: too
// short to be a real read (MIN_READ_SECONDS, shared with the client-side
// threshold via lib/read-tracking.ts), or long enough to suggest an
// idle/backgrounded tab.
export const MAX_READ_SECONDS = 1800;
export { MIN_READ_SECONDS, MIN_SAMPLE_SIZE_FOR_AVERAGE as MIN_SAMPLE_SIZE };

// null means "we genuinely could not check" (Appwrite unreachable/misconfigured
// or an unexpected error) — the caller should hide the metric rather than
// show a zero it can't vouch for. A missing document is NOT this case: it
// means zero meaningful reads have been recorded yet, which is real data.
export type ReadStats = { sampleCount: number; averageSeconds: number | null } | null;

function toStats(doc: Record<string, unknown> | null): ReadStats {
  return deriveReadStats(Number(doc?.sampleCount ?? 0), Number(doc?.totalSeconds ?? 0));
}

export async function getReadStats(slug: string): Promise<ReadStats> {
  const databases = getDatabases();
  if (!databases) return null;

  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_READ_STATS_COLLECTION_ID,
      toDocumentId(slug)
    );
    return toStats(doc as unknown as Record<string, unknown>);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return toStats(null);
    if (!isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read read-time stats", err);
    return null;
  }
}

// Real, site-wide count of completed read sessions (one per visitor beacon
// that passed the min/max sanity window), summed across the given slugs.
// Used for an honest "X real reads tracked" stat — never estimated/fabricated.
export async function getTotalReadSessions(slugs: string[]): Promise<number> {
  const databases = getDatabases();
  if (!databases) return 0;

  const counts = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const doc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_READ_STATS_COLLECTION_ID,
          toDocumentId(slug)
        );
        return Number((doc as unknown as Record<string, unknown>).sampleCount ?? 0);
      } catch (err) {
        if (err instanceof AppwriteException && err.code === 404) return 0;
        if (!isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read total read sessions", err);
        return 0;
      }
    })
  );

  return counts.reduce((sum, count) => sum + count, 0);
}

export async function getReadSessionCounts(slugs: string[]): Promise<Map<string, number>> {
  const databases = getDatabases();
  if (!databases) return new Map();
  const entries = await Promise.all(slugs.map(async (slug) => {
    try {
      const doc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_READ_STATS_COLLECTION_ID, toDocumentId(slug));
      return [slug, Number((doc as unknown as Record<string, unknown>).sampleCount ?? 0)] as const;
    } catch (err) {
      if (!(err instanceof AppwriteException && err.code === 404) && !isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read ranking stats", err);
      return [slug, 0] as const;
    }
  }));
  return new Map(entries);
}

const cachedReadSessionCounts = unstable_cache(
  async (slugs: string[]) => Object.fromEntries(await getReadSessionCounts(slugs)),
  ["homepage-read-session-counts"],
  { revalidate: 300, tags: ["homepage-editorial", "trending"] },
);

export async function getCachedReadSessionCounts(slugs: string[]) {
  return new Map(Object.entries(await cachedReadSessionCounts(slugs)));
}

// Returns the confirmed sampleCount after recording, straight from
// Appwrite's response to the increment/create call — never guessed. Returns
// null if the read couldn't be recorded (invalid input, Appwrite unavailable,
// or an unexpected error), so callers never optimistically bump a UI count
// without real confirmation.
export async function recordReadTime(slug: string, seconds: number): Promise<number | null> {
  if (!Number.isFinite(seconds) || seconds < MIN_READ_SECONDS || seconds > MAX_READ_SECONDS) return null;

  const databases = getDatabases();
  if (!databases) return null;

  const documentId = toDocumentId(slug);
  const rounded = Math.round(seconds);

  try {
    await databases.incrementDocumentAttribute(
      APPWRITE_DATABASE_ID,
      APPWRITE_READ_STATS_COLLECTION_ID,
      documentId,
      "totalSeconds",
      rounded
    );
    const updated = await databases.incrementDocumentAttribute(
      APPWRITE_DATABASE_ID,
      APPWRITE_READ_STATS_COLLECTION_ID,
      documentId,
      "sampleCount",
      1
    );
    return Number((updated as unknown as Record<string, unknown>).sampleCount ?? 0);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      try {
        const created = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_READ_STATS_COLLECTION_ID,
          documentId,
          { totalSeconds: rounded, sampleCount: 1 }
        );
        return Number((created as unknown as Record<string, unknown>).sampleCount ?? 1);
      } catch (createErr) {
        console.error("[freshscene] failed to create read-time stats document", createErr);
        return null;
      }
    }
    console.error("[freshscene] failed to record read time", err);
    return null;
  }
}

export async function recordPageView(slug: string, metric: "pageViews" | "uniqueReaders" | "repeatViews"): Promise<number | null> {
  const databases = getDatabases();
  if (!databases) return null;
  const documentId = toDocumentId(slug);
  try {
    const updated = await databases.incrementDocumentAttribute(APPWRITE_DATABASE_ID, APPWRITE_READ_STATS_COLLECTION_ID, documentId, metric, 1);
    return Number((updated as unknown as Record<string, unknown>)[metric] ?? 0);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      try {
        const created = await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_READ_STATS_COLLECTION_ID, documentId, { totalSeconds: 0, sampleCount: 0, [metric]: 1 });
        return Number((created as unknown as Record<string, unknown>)[metric] ?? 1);
      } catch (createErr) {
        if (createErr instanceof AppwriteException && createErr.code === 409) {
          try {
            const updated = await databases.incrementDocumentAttribute(APPWRITE_DATABASE_ID, APPWRITE_READ_STATS_COLLECTION_ID, documentId, metric, 1);
            return Number((updated as unknown as Record<string, unknown>)[metric] ?? 0);
          } catch { return null; }
        }
        console.error("[freshscene] failed to create page-view stats", createErr);
        return null;
      }
    }
    console.error("[freshscene] failed to record page-view stats", err);
    return null;
  }
}
