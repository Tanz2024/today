import { Client, Databases, Query } from "node-appwrite";
export async function runDailyCleanup({ maxPagesPerCollection = 2, maxItemsPerRun = 200, budget } = {}) {
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: _collection = "editorial_content" } = process.env;
  void _collection;
  if (!endpoint || !project || !key) return { status: "skipped" };
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const cutoff = Date.now() - 30 * 86400000;
  let deleted = 0;
  let scanned = 0;
  let pages = 0;
  const interactionCollections = [
    process.env.APPWRITE_POLL_BALLOTS_COLLECTION_ID,
    process.env.APPWRITE_REACTIONS_COLLECTION_ID,
    process.env.APPWRITE_REACTION_LOCKS_COLLECTION_ID,
    process.env.APPWRITE_QUICK_REACTIONS_COLLECTION_ID,
    process.env.APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID,
  ].filter(Boolean);
  for (const interactionCollection of interactionCollections) {
    try {
      let cursor;
      do {
        if (pages >= maxPagesPerCollection || scanned >= maxItemsPerRun) break;
        if (budget && !budget.checkpoint("cleanup-page", { collection: interactionCollection, pages, scanned })) break;
        const queries = [Query.limit(100)];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const interactionRows = await db.listDocuments(database, interactionCollection, queries);
        pages++;
        scanned += interactionRows.documents.length;
        for (const row of interactionRows.documents) {
          const created = new Date(row.createdAt ?? row.$createdAt ?? 0).getTime();
          if (created < cutoff && row.status !== "active") { await db.deleteDocument(database, interactionCollection, row.$id); deleted++; }
        }
        cursor = interactionRows.documents.length === 100 ? interactionRows.documents.at(-1)?.$id : undefined;
      } while (cursor);
    } catch { /* an optional interaction collection may not exist in every deployment */ }
  }
  return { status: "success", deleted, scanned, pages, bounded: pages >= maxPagesPerCollection || scanned >= maxItemsPerRun };
}
