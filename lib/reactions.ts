import { AppwriteException } from "node-appwrite";
import { unstable_cache } from "next/cache";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_REACTIONS_COLLECTION_ID,
  APPWRITE_REACTION_LOCKS_COLLECTION_ID,
  getDatabases,
  toDocumentId,
} from "@/lib/appwrite";
import { lockDocumentId } from "@/lib/identity";
import type { ReactionCounts, ReactionType } from "@/types/article";
import { isAppwriteDatabaseUnavailable } from "@/lib/appwrite-errors";

export const REACTION_TYPES: ReactionType[] = ["love", "laugh", "cry", "fire"];

const EMPTY: ReactionCounts = { love: 0, laugh: 0, cry: 0, fire: 0 };

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === "string" && (REACTION_TYPES as string[]).includes(value);
}

function toCounts(doc: Record<string, unknown> | null): ReactionCounts {
  if (!doc) return { ...EMPTY };
  return {
    love: Number(doc.love ?? 0),
    laugh: Number(doc.laugh ?? 0),
    cry: Number(doc.cry ?? 0),
    fire: Number(doc.fire ?? 0),
  };
}

export async function getReactionCounts(slug: string): Promise<ReactionCounts> {
  const databases = getDatabases();
  if (!databases) return { ...EMPTY };

  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_REACTIONS_COLLECTION_ID,
      toDocumentId(slug)
    );
    return toCounts(doc as unknown as Record<string, unknown>);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return { ...EMPTY };
    if (!isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read reactions", err);
    return { ...EMPTY };
  }
}

export async function adjustReaction(
  slug: string,
  type: ReactionType,
  delta: 1 | -1
): Promise<ReactionCounts | null> {
  const databases = getDatabases();
  if (!databases) return null;

  const documentId = toDocumentId(slug);

  try {
    const doc =
      delta > 0
        ? await databases.incrementDocumentAttribute(
            APPWRITE_DATABASE_ID,
            APPWRITE_REACTIONS_COLLECTION_ID,
            documentId,
            type,
            delta,
            undefined
          )
        : await databases.decrementDocumentAttribute(
            APPWRITE_DATABASE_ID,
            APPWRITE_REACTIONS_COLLECTION_ID,
            documentId,
            type,
            -delta,
            0
          );
    return toCounts(doc as unknown as Record<string, unknown>);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      try {
        const doc = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_REACTIONS_COLLECTION_ID,
          documentId,
          { ...EMPTY, [type]: Math.max(0, delta) }
        );
        return toCounts(doc as unknown as Record<string, unknown>);
      } catch (createErr) {
        if (isAppwriteDatabaseUnavailable(createErr)) return null;
        console.error("[freshscene] failed to create reaction document", createErr);
        throw createErr;
      }
    }
    if (isAppwriteDatabaseUnavailable(err)) return null;
    console.error("[freshscene] failed to adjust reaction", err);
    throw err;
  }
}

// Returns the reaction type this visitor already locked in for this slug, if any.
// Used to silently ignore repeat/switching attempts from the same visitor
// (including from a fresh browser/incognito session) without surfacing a
// "you're locked out" state in the UI.
export async function getReactionLock(visitorId: string, slug: string): Promise<ReactionType | null> {
  const databases = getDatabases();
  if (!databases) return null;

  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_REACTION_LOCKS_COLLECTION_ID,
      lockDocumentId(visitorId, slug)
    );
    const type = (doc as unknown as { type?: string }).type;
    return isReactionType(type) ? type : null;
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    if (!isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read reaction lock", err);
    return null;
  }
}

export async function lockReaction(visitorId: string, slug: string, type: ReactionType): Promise<void> {
  const databases = getDatabases();
  if (!databases) return;

  try {
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_REACTION_LOCKS_COLLECTION_ID,
      lockDocumentId(visitorId, slug),
      { type }
    );
  } catch (err) {
    console.error("[freshscene] failed to write reaction lock", err);
  }
}

export async function getManyReactionTotals(
  slugs: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  const counts = await Promise.all(slugs.map((slug) => getReactionCounts(slug)));
  slugs.forEach((slug, i) => {
    const c = counts[i];
    totals.set(slug, REACTION_TYPES.reduce((sum, t) => sum + c[t], 0));
  });
  return totals;
}

// Cached variant for read-heavy, non-critical-freshness surfaces (like the
// homepage), so a flaky/slow connection doesn't force a fresh round-trip to
// Appwrite for every single visitor. /trending intentionally stays
// uncached — it wants live ranking. 60s keeps counts "reasonably fresh"
// without hammering Appwrite on every homepage request.
const cachedReactionTotals = unstable_cache(
  async (slugs: string[]) => {
    const totals = await getManyReactionTotals(slugs);
    return Object.fromEntries(totals);
  },
  ["homepage-reaction-totals"],
  { revalidate: 300 }
);

export async function getCachedReactionTotals(slugs: string[]): Promise<Map<string, number>> {
  const plain = await cachedReactionTotals(slugs);
  return new Map(Object.entries(plain));
}
