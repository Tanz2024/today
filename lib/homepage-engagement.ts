import { Query } from "node-appwrite";
import { unstable_cache } from "next/cache";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_READ_STATS_COLLECTION_ID,
  APPWRITE_REACTIONS_COLLECTION_ID,
  getDatabases,
  toDocumentId,
} from "@/lib/appwrite";
import { REACTION_TYPES } from "@/lib/reactions";
import { isAppwriteDatabaseUnavailable, warnAppwriteQuotaUnavailable } from "@/lib/appwrite-errors";

const BATCH_SIZE = 100;

export type HomepageEngagement = {
  reactions: number;
  reads: number;
  engagementScore: number;
};
export type HomepageEngagementResult =
  | { status: "available"; data: Map<string, HomepageEngagement> }
  | { status: "unavailable"; reason: "quota" };

let lastKnownGood: { slugs: string[]; data: Record<string, HomepageEngagement> } | null = null;

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function listByIds(collectionId: string, ids: string[]) {
  const databases = getDatabases();
  if (!databases || !collectionId || ids.length === 0) return [];
  const results = await Promise.all(chunks(ids, BATCH_SIZE).map((batch) =>
    databases.listDocuments(APPWRITE_DATABASE_ID, collectionId, [Query.equal("$id", batch), Query.limit(BATCH_SIZE)]),
  ));
  return results.flatMap((result) => result.documents as unknown as Array<Record<string, unknown>>);
}

async function loadHomepageEngagement(slugs: string[]): Promise<Record<string, HomepageEngagement>> {
  const uniqueSlugs = [...new Set(slugs)];
  const idToSlug = new Map(uniqueSlugs.map((slug) => [toDocumentId(slug), slug]));
  const [reactionDocs, readDocs] = await Promise.all([
    listByIds(APPWRITE_REACTIONS_COLLECTION_ID, [...idToSlug.keys()]),
    listByIds(APPWRITE_READ_STATS_COLLECTION_ID, [...idToSlug.keys()]),
  ]);
  const engagement: Record<string, HomepageEngagement> = {};
  for (const slug of uniqueSlugs) engagement[slug] = { reactions: 0, reads: 0, engagementScore: 0 };
  for (const document of reactionDocs) {
    const slug = idToSlug.get(String(document.$id ?? ""));
    if (!slug) continue;
    const reactions = REACTION_TYPES.reduce((sum, type) => sum + Number(document[type] ?? 0), 0);
    engagement[slug].reactions = reactions;
  }
  for (const document of readDocs) {
    const slug = idToSlug.get(String(document.$id ?? ""));
    if (!slug) continue;
    engagement[slug].reads = Number(document.sampleCount ?? 0);
  }
  for (const value of Object.values(engagement)) value.engagementScore = value.reactions * 3 + value.reads * 2;
  return engagement;
}

const cachedHomepageEngagement = unstable_cache(loadHomepageEngagement, ["homepage-engagement"], {
  revalidate: 300,
  tags: ["homepage-editorial", "trending"],
});

export async function getCachedHomepageEngagement(slugs: string[]) {
  try {
    const plain = await cachedHomepageEngagement(slugs);
    lastKnownGood = { slugs: [...slugs], data: plain };
    return { status: "available", data: new Map(Object.entries(plain)) } satisfies HomepageEngagementResult;
  } catch (error) {
    if (!isAppwriteDatabaseUnavailable(error)) throw error;
    warnAppwriteQuotaUnavailable("homepage engagement");
    if (lastKnownGood && lastKnownGood.slugs.length === slugs.length && lastKnownGood.slugs.every((slug, index) => slug === slugs[index])) {
      return { status: "available", data: new Map(Object.entries(lastKnownGood.data)) } satisfies HomepageEngagementResult;
    }
    return { status: "unavailable", reason: "quota" } satisfies HomepageEngagementResult;
  }
}
