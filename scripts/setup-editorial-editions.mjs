import { Client, Databases, AppwriteException } from "node-appwrite";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) for (const line of readFileSync(".env.local", "utf8").split("\n")) { const i = line.indexOf("="); if (i > 0 && !line.trim().startsWith("#") && process.env[line.slice(0, i).trim()] === undefined) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_EDITIONS_COLLECTION_ID: collection = "editorial_editions" } = process.env;
if (!endpoint || !project || !key) throw new Error("APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY are required");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const attrs = [{ key: "editionKey", size: 120, required: true }, { key: "editionType", size: 40, required: true }, { key: "status", size: 20, required: true }, { key: "publishDate", size: 20, required: true }, { key: "publishAt", size: 40, required: true }, { key: "committedAt", size: 40, required: false }, { key: "itemIds", size: 4096, required: true }];
try { await db.getCollection(database, collection); } catch (error) { if (!(error instanceof AppwriteException && error.code === 404)) throw error; await db.createCollection(database, collection, "Editorial Editions", [], false, true); }
const current = await db.listAttributes(database, collection);
for (const attr of attrs) if (!current.attributes.some((item) => item.key === attr.key)) await db.createStringAttribute(database, collection, attr.key, attr.size, attr.required);
if (!current.attributes.some((item) => item.key === "expectedItemCount")) await db.createIntegerAttribute(database, collection, "expectedItemCount", true, 5);
console.log(`[setup-editorial-editions] ready: ${database}/${collection}`);
