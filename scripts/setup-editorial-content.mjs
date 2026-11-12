// Non-destructive Appwrite schema setup for Phase 2A editorial content.
// Run with: node scripts/setup-editorial-content.mjs
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client, Databases, AppwriteException } from "node-appwrite";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || "brisastory";
const collectionId = process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID || "editorial_content";
if (!endpoint || !project || !key) throw new Error("APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are required");

const databases = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const fields = [
  ["type", "string", 32], ["externalId", "string", 200], ["title", "string", 500], ["subtitle", "string", 500],
  ["description", "string", 2000], ["imageUrl", "string", 2000], ["destinationUrl", "string", 2000], ["source", "string", 80],
  ["sourceUrl", "string", 2000], ["sourceRank", "integer"], ["sourceScore", "double"], ["region", "string", 80],
  ["genres", "string", 1000], ["releaseDate", "string", 40], ["discoveredAt", "string", 40], ["brisaScore", "double"],
  ["manualBoost", "double"], ["repeatPenalty", "double"], ["diversityKey", "string", 160], ["status", "string", 32],
  ["publishAt", "string", 40], ["expireAt", "string", 40], ["slot", "string", 64], ["editionKey", "string", 120], ["displayOrder", "integer"], ["editorOverride", "boolean"],
  ["editorNote", "string", 2000], ["payload", "string", 20000], ["createdAt", "string", 40], ["updatedAt", "string", 40],
  ["articleType", "string", 40], ["contentOrigin", "string", 40], ["originalReporting", "boolean"], ["generatedBy", "string", 120], ["editorialVersion", "string", 40], ["categoryConfidence", "double"], ["researchStatus", "string", 32], ["factCheckStatus", "string", 32],
];
const indexes = [
  ["slot_status_publishAt", "key", ["slot", "status", "publishAt"]],
  ["slot_editionKey_displayOrder", "key", ["slot", "editionKey", "displayOrder"]],
  ["type_status_publishAt", "key", ["type", "status", "publishAt"]],
  ["source_externalId", "unique", ["source", "externalId"]],
  ["expireAt", "key", ["expireAt"]],
  ["createdAt", "key", ["createdAt"]],
];
const conflict = (error) => error instanceof AppwriteException && error.code === 409;

try { await databases.get(databaseId); } catch (error) {
  if (error instanceof AppwriteException && error.code === 404) await databases.create(databaseId, "FreshScene");
  else if (!conflict(error)) throw error;
}
let collection;
try { collection = await databases.getCollection(databaseId, collectionId); } catch (error) {
  if (!(error instanceof AppwriteException && error.code === 404)) throw error;
  collection = await databases.createCollection(databaseId, collectionId, "Editorial Content", [], false, true);
}
for (const [keyName, type, size] of fields) {
  try {
    if (type === "string") await databases.createStringAttribute(databaseId, collection.$id, keyName, size, false);
    if (type === "integer") await databases.createIntegerAttribute(databaseId, collection.$id, keyName, false);
    if (type === "double") await databases.createFloatAttribute(databaseId, collection.$id, keyName, false);
    if (type === "boolean") await databases.createBooleanAttribute(databaseId, collection.$id, keyName, false, false);
  } catch (error) { if (!conflict(error)) throw error; }
}
const attributeDeadline = Date.now() + 30000;
while (Date.now() < attributeDeadline) {
  const attributes = await databases.listAttributes(databaseId, collection.$id);
  if (attributes.attributes.filter((attribute) => fields.some(([keyName]) => keyName === attribute.key)).every((attribute) => attribute.status === "available")) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
for (const [name, type, attributes] of indexes) {
  try { await databases.createIndex(databaseId, collection.$id, name, type, attributes); } catch (error) { if (!conflict(error)) throw error; }
}
console.log(`[setup-editorial-content] ready: ${databaseId}/${collection.$id}`);
