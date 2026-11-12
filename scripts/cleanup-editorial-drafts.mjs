import { Client, Databases, Query } from "node-appwrite";
const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const cutoff = Date.now() - 14 * 86400000;
const rows = await db.listDocuments(database, collection, [Query.equal("type", "article"), Query.limit(100)]);
let deleted = 0;
for (const row of rows.documents) {
  const created = new Date(row.createdAt ?? row.$createdAt ?? 0).getTime();
  if (row.status !== "published" && created && created < cutoff) { await db.deleteDocument(database, collection, row.$id); deleted++; }
}
console.log(JSON.stringify({ temporaryRecordsDeleted: deleted, cutoff: new Date(cutoff).toISOString() }));
