import { Client, Databases, AppwriteException } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
const database = process.env.APPWRITE_DATABASE_ID || "brisastory";
const collection = process.env.APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID || "community_submissions";
const draftsCollection = process.env.APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID || "community_drafts";
const auditCollection = process.env.APPWRITE_COMMUNITY_AUDIT_COLLECTION_ID || "community_moderation_audit";
const reportsCollection = process.env.APPWRITE_COMMUNITY_REPORTS_COLLECTION_ID || "community_reports";
if (!endpoint || !project || !key) throw new Error("Missing Appwrite environment variables");

const databases = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
try { await databases.getCollection(database, collection); } catch (error) {
  if (!(error instanceof AppwriteException && error.code === 404)) throw error;
  await databases.createCollection(database, collection, "Community submissions", [], false, true);
  console.log(`Created ${database}/${collection}`);
}
const existing = await databases.listAttributes(database, collection);
const names = new Set(existing.attributes.map((attribute) => attribute.key));
const add = async (keyName, type, size = 512) => {
  if (names.has(keyName)) return;
  if (type === "datetime") await databases.createDatetimeAttribute(database, collection, keyName, false);
  else await databases.createStringAttribute(database, collection, keyName, size, false);
  console.log(`Added ${keyName}`);
};
const addOptional = async (keyName, size = 512) => { if (!names.has(keyName)) await databases.createStringAttribute(database, collection, keyName, size, false); };
for (const [keyName, size] of [["source", 40], ["status", 40], ["authorId", 128], ["authorEmail", 254], ["displayNameSnapshot", 80], ["avatarReference", 512], ["title", 140], ["slug", 180], ["category", 80], ["tags", 512], ["description", 240], ["content", 40000], ["coverMediaId", 80], ["videoMediaId", 80], ["contentHash", 128], ["idempotencyKey", 160], ["feedback", 2000], ["consentVersion", 40], ["reviewedBy", 128]]) await addOptional(keyName, size);
for (const keyName of ["createdAt", "submittedAt", "reviewedAt", "consentAt"]) await addOptional(keyName, 40);
await add("coverObjectKey", "string", 512);
await add("videoObjectKey", "string", 512);
await addOptional("coverAlt", 240); await addOptional("coverCredit", 240);
await add("publishedAt", "datetime");
await add("reactions", "string", 512);
await add("readerQuestion", "string", 240);
console.log(`Community schema ready: ${database}/${collection}`);

async function ensureCollection(collectionId, name) {
  try { await databases.getCollection(database, collectionId); } catch { await databases.createCollection(database, collectionId, name, [], false, false); console.log(`Created ${database}/${collectionId}`); }
  const attributes = await databases.listAttributes(database, collectionId);
  const keys = new Set(attributes.attributes.map((attribute) => attribute.key));
  const addRequired = async (keyName, size = 512) => { if (!keys.has(keyName)) await databases.createStringAttribute(database, collectionId, keyName, size, true); };
  await addRequired("authorId", 128); await addRequired("title", 140); await addRequired("draft", 250000); await addRequired("updatedAt", 40);
}
await ensureCollection(draftsCollection, "Community drafts");
console.log(`Community drafts schema ready: ${database}/${draftsCollection}`);
await ensureCollection(auditCollection, "Community moderation audit");
const auditAttrs = await databases.listAttributes(database, auditCollection);
const auditKeys = new Set(auditAttrs.attributes.map((attribute) => attribute.key));
for (const [keyName, size] of [["submissionId", 128], ["previousStatus", 40], ["newStatus", 40], ["action", 60], ["reason", 2000], ["moderatorId", 128], ["createdAt", 40]]) if (!auditKeys.has(keyName)) await databases.createStringAttribute(database, auditCollection, keyName, size, false);
console.log(`Community audit schema ready: ${database}/${auditCollection}`);
await ensureCollection(reportsCollection, "Community reports");
const reportAttrs = await databases.listAttributes(database, reportsCollection);
const reportKeys = new Set(reportAttrs.attributes.map((attribute) => attribute.key));
for (const [keyName, size] of [["submissionId", 128], ["reason", 40], ["details", 1000], ["visitorHash", 128], ["status", 40], ["createdAt", 40]]) if (!reportKeys.has(keyName)) await databases.createStringAttribute(database, reportsCollection, keyName, size, false);
console.log(`Community reports schema ready: ${database}/${reportsCollection}`);
