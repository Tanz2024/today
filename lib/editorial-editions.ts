import "server-only";
import { Query } from "node-appwrite";
import { unstable_cache } from "next/cache";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";
import { DAILY_INTERACTIVE_SLOTS, dailyInteractiveEditionKey } from "@/lib/editorial-edition-utils";
import { isAppwriteDatabaseUnavailable, warnAppwriteQuotaUnavailable } from "@/lib/appwrite-errors";

export { DAILY_INTERACTIVE_SLOTS, dailyEditionContentQueries, dailyInteractiveEditionKey, isCompleteDailyEdition } from "@/lib/editorial-edition-utils";
export const EDITORIAL_EDITIONS_COLLECTION_ID = process.env.APPWRITE_EDITORIAL_EDITIONS_COLLECTION_ID ?? "editorial_editions";

type Manifest = { editionKey: string; editionType: string; status: string; publishAt?: string; publishDate?: string; expectedItemCount?: number; itemIds?: string[] };

async function getCommittedManifest(dateKey: string) {
  const databases = getDatabases();
  if (!databases) return null;
  try {
    const result = await databases.listDocuments(APPWRITE_DATABASE_ID, EDITORIAL_EDITIONS_COLLECTION_ID, [Query.equal("editionKey", dailyInteractiveEditionKey(dateKey)), Query.equal("editionType", "daily_interactive"), Query.equal("status", "committed"), Query.limit(1)]);
    return (result.documents[0] as unknown as Manifest | undefined) ?? null;
  } catch (error) {
    if (!isAppwriteDatabaseUnavailable(error)) throw error;
    warnAppwriteQuotaUnavailable("editorial daily manifest");
    return null;
  }
}

export const getCommittedDailyManifest = unstable_cache(async (dateKey: string) => {
  return getCommittedManifest(dateKey);
}, ["committed-daily-manifest"], { revalidate: 3600, tags: ["homepage-editorial", "daily-interactive"] });

export function isDailyInteractiveSlot(slot: string) {
  return (DAILY_INTERACTIVE_SLOTS as readonly string[]).includes(slot);
}
