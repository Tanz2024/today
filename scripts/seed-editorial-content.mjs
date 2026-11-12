import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Client, Databases, ID, Query } from "node-appwrite";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) { const i = line.indexOf("="); if (i > 0 && !line.trim().startsWith("#") && process.env[line.slice(0, i).trim()] === undefined) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
const dryRun = process.argv.includes("--dry-run");
const date = (offset) => { const d = new Date(Date.UTC(2026, 8, 21 + offset)); return d.toISOString().slice(0, 10); };
const after = (value, days) => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const at = (day) => `${day}T00:00:00+08:00`;
const trivia = [
  ["Which planet is known as the Red Planet?", ["Mars", "Venus", "Jupiter", "Mercury"], "Mars", "Iron minerals on its surface give Mars its reddish appearance."],
  ["How many sides does a hexagon have?", ["Five", "Six", "Seven", "Eight"], "Six", "The prefix hex- means six."],
  ["What is the largest ocean on Earth?", ["Atlantic", "Indian", "Pacific", "Arctic"], "Pacific", "The Pacific Ocean covers more area than any other ocean."],
  ["Which gas do plants absorb during photosynthesis?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], "Carbon dioxide", "Plants use carbon dioxide, water and light to make food."],
  ["What is the capital city of Japan?", ["Kyoto", "Osaka", "Tokyo", "Sapporo"], "Tokyo", "Tokyo is Japan's capital and largest metropolitan area."],
  ["How many minutes are in two hours?", ["60", "90", "120", "180"], "120", "One hour has 60 minutes, so two hours have 120."],
  ["Which instrument has black and white keys?", ["Violin", "Piano", "Flute", "Trumpet"], "Piano", "A piano keyboard uses black and white keys for its notes."],
  ["What do bees collect from flowers?", ["Nectar", "Pebbles", "Salt", "Bark"], "Nectar", "Bees collect nectar and pollen from flowers."],
  ["Which shape has three sides?", ["Square", "Circle", "Triangle", "Pentagon"], "Triangle", "A triangle is a polygon with three sides."],
  ["What is H2O commonly called?", ["Salt", "Water", "Oxygen", "Sugar"], "Water", "H2O is the chemical formula for water."],
];
const chat = ["What's something you used to hate but actually like now?", "What song takes you straight back to a specific year?", "What's the best meal you can make with almost no effort?", "Which tiny purchase improved your daily life?", "What is an underrated way to spend an afternoon?", "What's a place you would happily visit again tomorrow?", "What is something you learned by accident?", "Which fictional home would you actually live in?", "What is your most reliable comfort watch?", "What's a habit you picked up from a friend?", "What is a very small thing that makes a day better?", "Which app could you delete for a week?", "What's the funniest misunderstanding you've had recently?", "What food do you defend more strongly than necessary?", "What would your ideal free morning look like?"];
const either = [["Go out", "Stay home"], ["Text first", "Wait for them"], ["Early flight", "Late flight"], ["City break", "Beach trip"], ["Sweet breakfast", "Savory breakfast"], ["Plan everything", "See what happens"], ["Playlist", "Podcast"], ["Window seat", "Aisle seat"]];
const docs = [];
for (let i = 0; i < 30; i++) { const item = trivia[i % trivia.length]; const day = date(i); docs.push({ stableId: `trivia-${day}`, type: "trivia", slot: "daily_trivia", title: item[0], externalId: `trivia-${day}`, status: "scheduled", publishAt: at(day), expireAt: at(date(i + 1)), editionKey: `trivia-${day}`, displayOrder: 1, payload: { question: item[0], options: item[1], correctAnswer: item[2], explanation: item[3] } }); }
for (let i = 0; i < 15; i++) { const day = date(i * 2); docs.push({ stableId: `group-chat-${day}`, type: "group_chat_question", slot: "group_chat_question", title: chat[i], externalId: `group-chat-${day}`, status: "scheduled", publishAt: at(day), expireAt: at(date(i * 2 + 2)), editionKey: `group-chat-${day}`, displayOrder: 1, payload: { question: chat[i] } }); }
for (let i = 0; i < 8; i++) { const day = date(i * 7); docs.push({ stableId: `this-or-that-${day}`, type: "this_or_that", slot: "this_or_that", title: either[i].join(" / "), externalId: `this-or-that-${day}`, status: "scheduled", publishAt: at(day), expireAt: at(date(i * 7 + 7)), editionKey: `this-or-that-${day}`, displayOrder: 1, payload: { left: either[i][0], right: either[i][1] } }); }
const read = (file) => JSON.parse(readFileSync(path.join(root, "content", file), "utf8"));
for (const item of read("music.json")) { const end = date(item.week === "2026-09-14" ? 0 : 7); docs.push({ stableId: item.id, type: "music", slot: "on_repeat_music", externalId: item.id, title: item.track, subtitle: item.artist, imageUrl: item.artwork, destinationUrl: item.spotifyUrl, status: "scheduled", editionKey: `music-${item.week}`, displayOrder: Number(item.id.slice(0, 2)), publishAt: at(item.week), expireAt: at(end), payload: item }); }
for (const item of read("daily-drops.json")) docs.push({ stableId: item.id, type: "daily_drop", slot: "daily_drop", externalId: item.id, title: item.storyTitle, status: "scheduled", publishAt: at(item.date), expireAt: at(after(item.date, 1)), payload: item });
for (const item of read("polls.json")) docs.push({ stableId: `poll-${item.id}`, type: "poll", slot: "pulse", externalId: item.id, title: item.question, status: "published", payload: item });
console.log(`[seed-editorial-content] ${dryRun ? "DRY RUN" : "WRITE"}: ${docs.length} documents`);
if (dryRun) process.exit(0);
const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
for (const item of docs) {
  const found = await db.listDocuments(database, collection, [Query.equal("externalId", item.externalId), Query.equal("type", item.type), Query.limit(1)]);
  const current = found.documents[0];
  const protectedState = current && ["approved", "scheduled", "published"].includes(current.status);
  const data = { ...item, payload: JSON.stringify(item.payload), status: protectedState ? current.status : item.status };
  delete data.stableId;
  if (current) await db.updateDocument(database, collection, current.$id, data); else await db.createDocument(database, collection, ID.unique(), data);
}
console.log(`[seed-editorial-content] wrote ${docs.length} idempotent documents`);
