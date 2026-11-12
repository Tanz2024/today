import { AppwriteException } from "node-appwrite";
import { unstable_cache } from "next/cache";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
  APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID,
  getDatabases,
  toDocumentId,
} from "@/lib/appwrite";
import { lockDocumentId } from "@/lib/identity";
import { resolveQuickReactionTransition } from "@/lib/quick-reactions-transition";
import { isAppwriteDatabaseUnavailable } from "@/lib/appwrite-errors";

// A different taxonomy from the emoji ReactionBar (love/laugh/cry/fire):
// these are text-labeled and, unlike that system, a visitor's pick is
// mutable — selecting a different option replaces the previous one.
export const QUICK_REACTION_TYPES = ["relatable", "helpful", "surprising", "notForMe"] as const;
export type QuickReactionType = (typeof QUICK_REACTION_TYPES)[number];
export type QuickReactionCounts = Record<QuickReactionType, number>;

const EMPTY: QuickReactionCounts = { relatable: 0, helpful: 0, surprising: 0, notForMe: 0 };

export function isQuickReactionType(value: unknown): value is QuickReactionType {
  return typeof value === "string" && (QUICK_REACTION_TYPES as readonly string[]).includes(value);
}

function toCounts(doc: Record<string, unknown> | null): QuickReactionCounts {
  if (!doc) return { ...EMPTY };
  return {
    relatable: Number(doc.relatable ?? 0),
    helpful: Number(doc.helpful ?? 0),
    surprising: Number(doc.surprising ?? 0),
    notForMe: Number(doc.notForMe ?? 0),
  };
}

export async function getQuickReactionCounts(targetId: string): Promise<QuickReactionCounts> {
  const databases = getDatabases();
  if (!databases) return { ...EMPTY };

  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
      toDocumentId(targetId)
    );
    return toCounts(doc as unknown as Record<string, unknown>);
  } catch (err) {
    if ((err instanceof AppwriteException && err.code === 404) || isAppwriteDatabaseUnavailable(err)) return { ...EMPTY };
    console.error("[freshscene] failed to read quick reactions", err);
    return { ...EMPTY };
  }
}

// Cached read for the homepage Daily Drop preview — a live vote/reaction
// still writes immediately via setQuickReaction(); this only affects how
// fresh the *displayed* count is on a cold homepage load (5 minutes max).
export const getCachedQuickReactionCounts = unstable_cache(
  (targetId: string) => getQuickReactionCounts(targetId),
  ["homepage-quick-reaction-counts"],
  { revalidate: 300 }
);

export async function getQuickReactionLock(
  visitorId: string,
  targetId: string
): Promise<QuickReactionType | null> {
  const databases = getDatabases();
  if (!databases) return null;

  try {
    const doc = await databases.getDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID,
      lockDocumentId(visitorId, targetId)
    );
    const type = (doc as unknown as { type?: string }).type;
    return isQuickReactionType(type) ? type : null;
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    console.error("[freshscene] failed to read quick reaction lock", err);
    return null;
  }
}

async function adjustCount(
  targetId: string,
  type: QuickReactionType,
  delta: 1 | -1
): Promise<QuickReactionCounts | null> {
  const databases = getDatabases();
  if (!databases) return null;

  const documentId = toDocumentId(targetId);

  try {
    const doc =
      delta > 0
        ? await databases.incrementDocumentAttribute(
            APPWRITE_DATABASE_ID,
            APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
            documentId,
            type,
            delta
          )
        : await databases.decrementDocumentAttribute(
            APPWRITE_DATABASE_ID,
            APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
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
          APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
          documentId,
          { ...EMPTY, [type]: Math.max(0, delta) }
        );
        return toCounts(doc as unknown as Record<string, unknown>);
      } catch (createErr) {
        console.error("[freshscene] failed to create quick reaction document", createErr);
        return null;
      }
    }
    console.error("[freshscene] failed to adjust quick reaction", err);
    return null;
  }
}

// Sets (or replaces) this visitor's single active quick reaction for a
// target. Returns the real current counts either way; `persisted` tells the
// caller whether the write actually happened (false only if Appwrite is
// unavailable).
export async function setQuickReaction(
  visitorId: string,
  targetId: string,
  type: QuickReactionType
): Promise<{ counts: QuickReactionCounts; persisted: boolean }> {
  const databases = getDatabases();
  if (!databases) return { counts: { ...EMPTY }, persisted: false };

  const existing = await getQuickReactionLock(visitorId, targetId);
  const transition = resolveQuickReactionTransition(existing, type);

  if (transition.kind === "noop") {
    return { counts: await getQuickReactionCounts(targetId), persisted: true };
  }

  if (transition.kind === "replace") {
    await adjustCount(targetId, transition.decrement, -1);
  }
  const counts = await adjustCount(targetId, transition.increment, 1);

  const lockId = lockDocumentId(visitorId, targetId);
  try {
    if (transition.kind === "replace") {
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID,
        lockId,
        { type }
      );
    } else {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID,
        lockId,
        { type }
      );
    }
  } catch (err) {
    console.error("[freshscene] failed to write quick reaction lock", err);
  }

  return { counts: counts ?? { ...EMPTY }, persisted: counts !== null };
}
