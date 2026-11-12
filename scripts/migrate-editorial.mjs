import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  ["daily_drop", "daily_drop", "content/daily-drops.json"], ["poll", "pulse", "content/polls.json"],
  ["music", "on_repeat_music", "content/music.json"], ["movie", "on_screen_movie", "content/on-screen.json"],
  ["horoscope", "horoscope_week", "content/horoscopes.json"], ["metro_pick", "metro_pick", "content/metro-picks.json"],
];
const dryRun = !process.argv.includes("--write");
const documents = [];
const editionEnd = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 7));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}T00:00:00+08:00`;
};
const editionKey = (prefix, date) => `${prefix}-${date}`;
for (const [type, slot, relative] of files) {
  const value = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  let entries = Array.isArray(value) ? value : Array.isArray(value.items) ? value.items : type === "horoscope" ? [{ title: "Weekly horoscope", payload: value }] : [value];
  const sourceEditionDate = value.week ?? value.date ?? null;
  let mappedType = type;
  let mappedSlot = slot;
  if (relative.endsWith("on-screen.json")) {
    entries = entries.map((entry) => ({ ...entry, _editorialType: entry.section === "Anime" ? "anime" : entry.section === "Trending TV" ? "tv" : "movie", _editorialSlot: entry.section === "Anime" ? "on_screen_anime" : entry.section === "Trending TV" ? "on_screen_tv" : "on_screen_movie" }));
  }
  entries.forEach((payload, index) => {
    const date = payload.date ?? payload.week ?? sourceEditionDate ?? (type === "horoscope" ? "2026-09-14" : null);
    const multi = ["music", "movie", "tv", "anime", "game", "metro_pick"].includes(payload._editorialType ?? mappedType);
    const normalizedType = payload._editorialType ?? mappedType;
    const normalizedSlot = payload._editorialSlot ?? mappedSlot;
    const keyPrefix = normalizedType === "music" ? "music" : normalizedType === "movie" || normalizedType === "tv" || normalizedType === "anime" || normalizedType === "game" ? "on-screen" : normalizedType;
    documents.push({
    type: normalizedType, slot: normalizedSlot, externalId: String(payload.id ?? payload.tmdbId ?? `${mappedSlot}-${index + 1}`),
    title: String(payload.title ?? payload.track ?? payload.storyTitle ?? payload.question ?? ""),
    status: "candidate", editionKey: multi && date ? editionKey(keyPrefix, date) : undefined, displayOrder: multi ? Number(payload.rank ?? index + 1) : undefined,
    publishAt: date ? `${date}T00:00:00+08:00` : null, expireAt: multi && date ? editionEnd(date) : null,
    payload,
    });
  });
}

const orderByEdition = new Map();
for (const document of documents) {
  if (!document.editionKey) continue;
  const orderKey = `${document.slot}:${document.editionKey}`;
  const next = (orderByEdition.get(orderKey) ?? 0) + 1;
  orderByEdition.set(orderKey, next);
  document.displayOrder = next;
}
const seen = new Set();
const conflicts = [];
for (const document of documents) {
  const key = `${document.type}:${document.externalId}`;
  if (seen.has(key)) conflicts.push(`duplicate ${key}`);
  seen.add(key);
  if (!document.title) conflicts.push(`missing title ${key}`);
}
console.log(`${dryRun ? "DRY RUN" : "WRITE MODE"}: ${documents.length} proposed documents`);
for (const document of documents) console.log(JSON.stringify({ type: document.type, slot: document.slot, editionKey: document.editionKey, displayOrder: document.displayOrder, externalId: document.externalId, title: document.title, publishAt: document.publishAt, expireAt: document.expireAt }));
if (conflicts.length) { console.log("Conflicts:"); conflicts.forEach((item) => console.log(`- ${item}`)); }
if (!dryRun) console.error("Write mode is intentionally not connected yet; Phase 2A requires explicit review before Appwrite writes.");
