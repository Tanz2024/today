// One-time/idempotent Appwrite schema setup for reactions + polls.
// Run with: npm run setup:appwrite
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client, Databases, AppwriteException } from "node-appwrite";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return env;
}

function updateEnvLocal(updates) {
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = existing.length ? existing.split("\n") : [];
  const seen = new Set();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return line;
    const key = trimmed.slice(0, idx).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }

  // Drop trailing blank lines, keep a single trailing newline.
  while (nextLines.length && nextLines[nextLines.length - 1] === "") nextLines.pop();
  writeFileSync(envPath, nextLines.join("\n") + "\n");
}

loadEnvLocal();

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "[setup-appwrite] Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY in .env.local"
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

const DATABASE_ID = "brisastory";
const DATABASE_NAME = "FreshScene";

const REACTIONS_COLLECTION_ID = "reactions";
const REACTIONS_COLLECTION_NAME = "Reactions";
// Matches lib/reactions.ts: one document per article slug, one integer counter per reaction type.
const REACTION_ATTRIBUTES = ["love", "laugh", "cry", "fire"];

const POLLS_COLLECTION_ID = "poll_votes";
const POLLS_COLLECTION_NAME = "Poll Votes";
// Matches lib/polls.ts: one document per poll id, vote counts serialized as JSON
// since poll options are dynamic (defined per-poll in content/polls.json).
const POLLS_COUNTS_ATTRIBUTE = "counts";
const POLLS_COUNTS_SIZE = 2000;

const REACTION_LOCKS_COLLECTION_ID = "reaction_locks";
const REACTION_LOCKS_COLLECTION_NAME = "Reaction Locks";
// Matches lib/reactions.ts: one document per (visitor, slug) pair, recording
// which reaction type they've already cast so repeats are silently ignored.
const REACTION_LOCKS_TYPE_ATTRIBUTE = "type";
const REACTION_LOCKS_TYPE_SIZE = 16;

const POLL_BALLOTS_COLLECTION_ID = "poll_ballots";
const POLL_BALLOTS_COLLECTION_NAME = "Poll Ballots";
// Matches lib/polls.ts: one document per (visitor, poll id) pair, recording
// which option they've already voted for so repeats are silently ignored.
const POLL_BALLOTS_OPTION_ATTRIBUTE = "option";
const POLL_BALLOTS_OPTION_SIZE = 200;

const READ_STATS_COLLECTION_ID = "read_stats";
const READ_STATS_COLLECTION_NAME = "Read Stats";
// Matches lib/read-stats.ts: one document per article slug, aggregating real
// per-visitor time-on-page beacons into a total + sample count (avg = total/count).
const READ_STATS_ATTRIBUTES = ["totalSeconds", "sampleCount"];

const QUICK_REACTIONS_COLLECTION_ID = "quick_reactions";
const QUICK_REACTIONS_COLLECTION_NAME = "Quick Reactions";
// Matches lib/quick-reactions.ts: one document per target (article slug or
// Daily Drop id), one integer counter per quick-reaction type.
const QUICK_REACTIONS_ATTRIBUTES = ["relatable", "helpful", "surprising", "notForMe"];

const QUICK_REACTION_LOCKS_COLLECTION_ID = "quick_reaction_locks";
const QUICK_REACTION_LOCKS_COLLECTION_NAME = "Quick Reaction Locks";
// Matches lib/quick-reactions.ts: one document per (visitor, target) pair,
// recording their current pick so a new pick can replace (not just block) it.
const QUICK_REACTION_LOCKS_TYPE_ATTRIBUTE = "type";
const QUICK_REACTION_LOCKS_TYPE_SIZE = 16;

const QUESTIONS_COLLECTION_ID = "question_submissions";
const QUESTIONS_COLLECTION_NAME = "Question Submissions";
// Matches lib/question-submissions.ts: anonymous "Real Questions" submissions,
// always created with status "pending" for manual moderation in the console.
const QUESTIONS_STRING_ATTRIBUTES = [
  { key: "text", size: 800, required: true },
  { key: "topic", size: 80, required: false },
  { key: "status", size: 20, required: true },
  { key: "visitorHash", size: 128, required: true },
];

const QUESTION_REASONS_COLLECTION_ID = "question_reasons";
const QUESTION_REASONS_COLLECTION_NAME = "Question Reasons";
const QUESTION_REASONS_STRING_ATTRIBUTES = [
  { key: "pollId", size: 180, required: true },
  { key: "questionSlug", size: 180, required: true },
  { key: "optionId", size: 180, required: true },
  { key: "reason", size: 280, required: true },
  { key: "status", size: 20, required: true },
  { key: "visitorHash", size: 128, required: true },
];
const QUESTION_REASON_QUOTAS_COLLECTION_ID = "question_reason_quotas";
const QUESTION_REASON_QUOTAS_COLLECTION_NAME = "Question Reason Quotas";
const QUESTION_REASON_QUOTAS_ATTRIBUTES = [
  { key: "count", size: 0, required: true, type: "integer" },
  { key: "day", size: 10, required: true, type: "string" },
];
const QUESTION_RELATIONS_COLLECTION_ID = "question_relations";
const QUESTION_RELATIONS_COLLECTION_NAME = "Question Relations";
const QUESTION_RELATIONS_STRING_ATTRIBUTES = [
  { key: "sourceQuestionSlug", size: 180, required: true },
  { key: "targetQuestionSlug", size: 180, required: true },
  { key: "relationType", size: 40, required: true },
  { key: "status", size: 20, required: true },
];
const QUESTION_RELATIONS_PRIORITY_ATTRIBUTE = "priority";

function isConflict(err) {
  return err instanceof AppwriteException && err.code === 409;
}

async function ensureDatabase() {
  try {
    await databases.get(DATABASE_ID);
    console.log(`[setup-appwrite] Database "${DATABASE_ID}" already exists, reusing it.`);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) {
      await databases.create(DATABASE_ID, DATABASE_NAME);
      console.log(`[setup-appwrite] Created database "${DATABASE_ID}".`);
    } else if (isConflict(err)) {
      console.log(`[setup-appwrite] Database "${DATABASE_ID}" already exists, reusing it.`);
    } else {
      throw err;
    }
  }
}

async function ensureCollection(collectionId, name) {
  try {
    await databases.getCollection(DATABASE_ID, collectionId);
    console.log(`[setup-appwrite] Collection "${collectionId}" already exists, reusing it.`);
    return;
  } catch (err) {
    if (!(err instanceof AppwriteException && err.code === 404)) throw err;
  }

  try {
    // No permissions granted to any role: only requests authenticated with the
    // server API key (which bypasses collection/document permissions entirely)
    // can read or write. documentSecurity stays off since there is nothing to
    // grant per-document either.
    await databases.createCollection(DATABASE_ID, collectionId, name, [], false, true);
    console.log(`[setup-appwrite] Created collection "${collectionId}".`);
  } catch (err) {
    if (isConflict(err)) {
      console.log(`[setup-appwrite] Collection "${collectionId}" already exists, reusing it.`);
    } else {
      throw err;
    }
  }
}

async function attributeExists(collectionId, key) {
  const { attributes } = await databases.listAttributes(DATABASE_ID, collectionId);
  return attributes.some((attr) => attr.key === key);
}

async function ensureIntegerAttribute(collectionId, key) {
  if (await attributeExists(collectionId, key)) {
    console.log(`[setup-appwrite]   attribute "${key}" already exists, skipping.`);
    return;
  }
  try {
    await databases.createIntegerAttribute(DATABASE_ID, collectionId, key, true, 0);
    console.log(`[setup-appwrite]   created integer attribute "${key}".`);
  } catch (err) {
    if (isConflict(err)) {
      console.log(`[setup-appwrite]   attribute "${key}" already exists, skipping.`);
    } else {
      throw err;
    }
  }
}

async function ensureStringAttribute(collectionId, key, size, required = true) {
  if (await attributeExists(collectionId, key)) {
    console.log(`[setup-appwrite]   attribute "${key}" already exists, skipping.`);
    return;
  }
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, key, size, required);
    console.log(`[setup-appwrite]   created string attribute "${key}".`);
  } catch (err) {
    if (isConflict(err)) {
      console.log(`[setup-appwrite]   attribute "${key}" already exists, skipping.`);
    } else {
      throw err;
    }
  }
}

async function waitForAttributes(collectionId, keys) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const { attributes } = await databases.listAttributes(DATABASE_ID, collectionId);
    const relevant = attributes.filter((attr) => keys.includes(attr.key));
    const allAvailable = relevant.length === keys.length && relevant.every((attr) => attr.status === "available");
    if (allAvailable) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.warn(
    `[setup-appwrite]   warning: attributes on "${collectionId}" did not report "available" within 30s; they may still be processing.`
  );
}

async function indexExists(collectionId, key) {
  const { indexes } = await databases.listIndexes(DATABASE_ID, collectionId);
  return indexes.some((index) => index.key === key);
}

async function ensureIndex(collectionId, key, type, attributes) {
  if (await indexExists(collectionId, key)) {
    console.log(`[setup-appwrite]   index "${key}" already exists, skipping.`);
    return;
  }
  try {
    await databases.createIndex(DATABASE_ID, collectionId, key, type, attributes);
    console.log(`[setup-appwrite]   created ${type} index "${key}" on [${attributes.join(", ")}].`);
  } catch (err) {
    if (isConflict(err)) {
      console.log(`[setup-appwrite]   index "${key}" already exists, skipping.`);
    } else {
      throw err;
    }
  }
}

async function verifyCollection(collectionId, label, requiredKeys) {
  const collection = await databases.getCollection(DATABASE_ID, collectionId);
  const { attributes } = await databases.listAttributes(DATABASE_ID, collectionId);
  console.log(
    `  ${label}: ${collection.name} (${collection.$id}) — attributes: ${attributes
      .map((a) => `${a.key}:${a.status}`)
      .join(", ")}`
  );
  return requiredKeys.every((key) => attributes.some((a) => a.key === key && a.status === "available"));
}

async function verify() {
  const db = await databases.get(DATABASE_ID);

  console.log("\n[setup-appwrite] Verification:");
  console.log(`  Database: ${db.name} (${db.$id})`);

  const reactionsOk = await verifyCollection(REACTIONS_COLLECTION_ID, "Reactions collection", REACTION_ATTRIBUTES);
  const pollsOk = await verifyCollection(POLLS_COLLECTION_ID, "Polls collection", [POLLS_COUNTS_ATTRIBUTE]);
  const reactionLocksOk = await verifyCollection(REACTION_LOCKS_COLLECTION_ID, "Reaction locks collection", [
    REACTION_LOCKS_TYPE_ATTRIBUTE,
  ]);
  const pollBallotsOk = await verifyCollection(POLL_BALLOTS_COLLECTION_ID, "Poll ballots collection", [
    POLL_BALLOTS_OPTION_ATTRIBUTE,
  ]);
  const readStatsOk = await verifyCollection(READ_STATS_COLLECTION_ID, "Read stats collection", READ_STATS_ATTRIBUTES);
  const quickReactionsOk = await verifyCollection(
    QUICK_REACTIONS_COLLECTION_ID,
    "Quick reactions collection",
    QUICK_REACTIONS_ATTRIBUTES
  );
  const quickReactionLocksOk = await verifyCollection(
    QUICK_REACTION_LOCKS_COLLECTION_ID,
    "Quick reaction locks collection",
    [QUICK_REACTION_LOCKS_TYPE_ATTRIBUTE]
  );
  const questionsOk = await verifyCollection(
    QUESTIONS_COLLECTION_ID,
    "Question submissions collection",
    QUESTIONS_STRING_ATTRIBUTES.map((attr) => attr.key)
  );
  const reasonsOk = await verifyCollection(
    QUESTION_REASONS_COLLECTION_ID,
    "Question reasons collection",
    QUESTION_REASONS_STRING_ATTRIBUTES.map((attr) => attr.key)
  );
  const quotasOk = await verifyCollection(QUESTION_REASON_QUOTAS_COLLECTION_ID, "Question reason quotas collection", QUESTION_REASON_QUOTAS_ATTRIBUTES.map((attr) => attr.key));
  const relationsOk = await verifyCollection(QUESTION_RELATIONS_COLLECTION_ID, "Question relations collection", [...QUESTION_RELATIONS_STRING_ATTRIBUTES.map((attr) => attr.key), QUESTION_RELATIONS_PRIORITY_ATTRIBUTE]);

  if (
    !reactionsOk ||
    !pollsOk ||
    !reactionLocksOk ||
    !pollBallotsOk ||
    !readStatsOk ||
    !quickReactionsOk ||
    !quickReactionLocksOk ||
    !questionsOk ||
    !reasonsOk || !quotasOk || !relationsOk
  ) {
    throw new Error("Verification failed: one or more attributes are not available.");
  }

  console.log("[setup-appwrite] All resources verified successfully.\n");
}

async function main() {
  console.log(`[setup-appwrite] Using endpoint ${ENDPOINT}, project ${PROJECT_ID}`);

  await ensureDatabase();

  await ensureCollection(REACTIONS_COLLECTION_ID, REACTIONS_COLLECTION_NAME);
  for (const key of REACTION_ATTRIBUTES) {
    await ensureIntegerAttribute(REACTIONS_COLLECTION_ID, key);
  }
  await waitForAttributes(REACTIONS_COLLECTION_ID, REACTION_ATTRIBUTES);

  await ensureCollection(POLLS_COLLECTION_ID, POLLS_COLLECTION_NAME);
  await ensureStringAttribute(POLLS_COLLECTION_ID, POLLS_COUNTS_ATTRIBUTE, POLLS_COUNTS_SIZE);
  await waitForAttributes(POLLS_COLLECTION_ID, [POLLS_COUNTS_ATTRIBUTE]);

  await ensureCollection(REACTION_LOCKS_COLLECTION_ID, REACTION_LOCKS_COLLECTION_NAME);
  await ensureStringAttribute(REACTION_LOCKS_COLLECTION_ID, REACTION_LOCKS_TYPE_ATTRIBUTE, REACTION_LOCKS_TYPE_SIZE);
  await waitForAttributes(REACTION_LOCKS_COLLECTION_ID, [REACTION_LOCKS_TYPE_ATTRIBUTE]);

  await ensureCollection(POLL_BALLOTS_COLLECTION_ID, POLL_BALLOTS_COLLECTION_NAME);
  await ensureStringAttribute(POLL_BALLOTS_COLLECTION_ID, POLL_BALLOTS_OPTION_ATTRIBUTE, POLL_BALLOTS_OPTION_SIZE);
  await waitForAttributes(POLL_BALLOTS_COLLECTION_ID, [POLL_BALLOTS_OPTION_ATTRIBUTE]);

  await ensureCollection(READ_STATS_COLLECTION_ID, READ_STATS_COLLECTION_NAME);
  for (const key of READ_STATS_ATTRIBUTES) {
    await ensureIntegerAttribute(READ_STATS_COLLECTION_ID, key);
  }
  await waitForAttributes(READ_STATS_COLLECTION_ID, READ_STATS_ATTRIBUTES);

  await ensureCollection(QUICK_REACTIONS_COLLECTION_ID, QUICK_REACTIONS_COLLECTION_NAME);
  for (const key of QUICK_REACTIONS_ATTRIBUTES) {
    await ensureIntegerAttribute(QUICK_REACTIONS_COLLECTION_ID, key);
  }
  await waitForAttributes(QUICK_REACTIONS_COLLECTION_ID, QUICK_REACTIONS_ATTRIBUTES);

  await ensureCollection(QUICK_REACTION_LOCKS_COLLECTION_ID, QUICK_REACTION_LOCKS_COLLECTION_NAME);
  await ensureStringAttribute(
    QUICK_REACTION_LOCKS_COLLECTION_ID,
    QUICK_REACTION_LOCKS_TYPE_ATTRIBUTE,
    QUICK_REACTION_LOCKS_TYPE_SIZE
  );
  await waitForAttributes(QUICK_REACTION_LOCKS_COLLECTION_ID, [QUICK_REACTION_LOCKS_TYPE_ATTRIBUTE]);

  await ensureCollection(QUESTIONS_COLLECTION_ID, QUESTIONS_COLLECTION_NAME);
  for (const attr of QUESTIONS_STRING_ATTRIBUTES) {
    await ensureStringAttribute(QUESTIONS_COLLECTION_ID, attr.key, attr.size, attr.required);
  }
  await waitForAttributes(
    QUESTIONS_COLLECTION_ID,
    QUESTIONS_STRING_ATTRIBUTES.map((attr) => attr.key)
  );
  // Needed for the per-visitor daily rate-limit query (Query.equal on
  // visitorHash) — $createdAt is a built-in attribute and already indexed.
  await ensureIndex(QUESTIONS_COLLECTION_ID, "visitorHash_idx", "key", ["visitorHash"]);
  // Lets moderators (and any future admin view) filter by status efficiently.
  await ensureIndex(QUESTIONS_COLLECTION_ID, "status_idx", "key", ["status"]);

  await ensureCollection(QUESTION_REASONS_COLLECTION_ID, QUESTION_REASONS_COLLECTION_NAME);
  for (const attr of QUESTION_REASONS_STRING_ATTRIBUTES) {
    await ensureStringAttribute(QUESTION_REASONS_COLLECTION_ID, attr.key, attr.size, attr.required);
  }
  await waitForAttributes(QUESTION_REASONS_COLLECTION_ID, QUESTION_REASONS_STRING_ATTRIBUTES.map((attr) => attr.key));
  await ensureIndex(QUESTION_REASONS_COLLECTION_ID, "poll_status_idx", "key", ["pollId", "status"]);
  await ensureIndex(QUESTION_REASONS_COLLECTION_ID, "question_status_idx", "key", ["questionSlug", "status"]);
  await ensureIndex(QUESTION_REASONS_COLLECTION_ID, "visitor_poll_idx", "key", ["visitorHash", "pollId"]);
  await ensureIndex(QUESTION_REASONS_COLLECTION_ID, "visitor_created_idx", "key", ["visitorHash", "$createdAt"]);
  await ensureCollection(QUESTION_REASON_QUOTAS_COLLECTION_ID, QUESTION_REASON_QUOTAS_COLLECTION_NAME);
  for (const attr of QUESTION_REASON_QUOTAS_ATTRIBUTES) {
    if (attr.type === "integer") await ensureIntegerAttribute(QUESTION_REASON_QUOTAS_COLLECTION_ID, attr.key);
    else await ensureStringAttribute(QUESTION_REASON_QUOTAS_COLLECTION_ID, attr.key, attr.size, attr.required);
  }
  await waitForAttributes(QUESTION_REASON_QUOTAS_COLLECTION_ID, QUESTION_REASON_QUOTAS_ATTRIBUTES.map((attr) => attr.key));

  await ensureCollection(QUESTION_RELATIONS_COLLECTION_ID, QUESTION_RELATIONS_COLLECTION_NAME);
  for (const attr of QUESTION_RELATIONS_STRING_ATTRIBUTES) await ensureStringAttribute(QUESTION_RELATIONS_COLLECTION_ID, attr.key, attr.size, attr.required);
  await ensureIntegerAttribute(QUESTION_RELATIONS_COLLECTION_ID, QUESTION_RELATIONS_PRIORITY_ATTRIBUTE);
  await waitForAttributes(QUESTION_RELATIONS_COLLECTION_ID, [...QUESTION_RELATIONS_STRING_ATTRIBUTES.map((attr) => attr.key), QUESTION_RELATIONS_PRIORITY_ATTRIBUTE]);
  await ensureIndex(QUESTION_RELATIONS_COLLECTION_ID, "source_status_priority_idx", "key", ["sourceQuestionSlug", "status", "priority"]);
  await ensureIndex(QUESTION_RELATIONS_COLLECTION_ID, "source_target_idx", "key", ["sourceQuestionSlug", "targetQuestionSlug"]);

  // No secondary indexes are created on the other collections: they're all
  // read/written by document ID only (article slug / poll id / hashed
  // visitor+key), which Appwrite already indexes internally.

  await verify();

  updateEnvLocal({
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_REACTIONS_COLLECTION_ID: REACTIONS_COLLECTION_ID,
    APPWRITE_POLLS_COLLECTION_ID: POLLS_COLLECTION_ID,
    APPWRITE_REACTION_LOCKS_COLLECTION_ID: REACTION_LOCKS_COLLECTION_ID,
    APPWRITE_POLL_BALLOTS_COLLECTION_ID: POLL_BALLOTS_COLLECTION_ID,
    APPWRITE_READ_STATS_COLLECTION_ID: READ_STATS_COLLECTION_ID,
    APPWRITE_QUICK_REACTIONS_COLLECTION_ID: QUICK_REACTIONS_COLLECTION_ID,
    APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID: QUICK_REACTION_LOCKS_COLLECTION_ID,
    APPWRITE_QUESTIONS_COLLECTION_ID: QUESTIONS_COLLECTION_ID,
    APPWRITE_QUESTION_REASONS_COLLECTION_ID: QUESTION_REASONS_COLLECTION_ID,
    APPWRITE_QUESTION_REASON_QUOTAS_COLLECTION_ID: QUESTION_REASON_QUOTAS_COLLECTION_ID,
    APPWRITE_QUESTION_RELATIONS_COLLECTION_ID: QUESTION_RELATIONS_COLLECTION_ID,
  });
  console.log("[setup-appwrite] Updated .env.local with database/collection IDs.");
}

main().catch((err) => {
  console.error("[setup-appwrite] Setup failed:", err);
  process.exit(1);
});
