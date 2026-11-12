import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client, Databases, ID, Query } from "node-appwrite";
import { generateWeeklyQuestion } from "../functions/editorial-weekly/lib/editorial-weekly-question.mjs";
import { getNextMalaysiaMondayBoundary } from "../functions/editorial-weekly/lib/editorial-weekly-runner.mjs";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const index = line.indexOf("=");
  if (index > 0 && !line.trim().startsWith("#") && process.env[line.slice(0, index).trim()] === undefined) {
    process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
}

const { dateKey, publishAt, expireAt } = getNextMalaysiaMondayBoundary();
const question = await generateWeeklyQuestion() || {
  question: "What is one small thing you are looking forward to this week?",
  shortAnswer: "It can be something simple: a good meal, a new episode, seeing a friend, or finally getting some quiet time.",
  topic: "weekly question",
  reactions: ["love", "laugh", "wow", "relatable"],
};

const endpoint = process.env.APPWRITE_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID;
const key = process.env.APPWRITE_API_KEY;
const database = process.env.APPWRITE_DATABASE_ID || "brisastory";
const collection = process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID || "editorial_content";
if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required.");

const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const editionKey = `weekly-question-${dateKey}`;
const data = {
  type: "weekly_question", slot: "weekly_question", source: "openrouter",
  externalId: editionKey, title: question.question, description: question.shortAnswer,
  editionKey, displayOrder: 1, publishAt, expireAt, status: "scheduled",
  payload: JSON.stringify(question),
};
const found = await db.listDocuments(database, collection, [Query.equal("slot", "weekly_question"), Query.equal("editionKey", editionKey), Query.limit(1)]);
if (found.documents[0]) await db.updateDocument(database, collection, found.documents[0].$id, data);
else await db.createDocument(database, collection, ID.unique(), data);
console.log(JSON.stringify({ editionKey, question: question.question, shortAnswer: question.shortAnswer }, null, 2));
