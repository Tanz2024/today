import { writeFile } from "node:fs/promises";
import { Client, Databases, ID, Query } from "node-appwrite";
import { fetchAniList, fetchListenBrainz, fetchTmdb } from "../functions/editorial-weekly/lib/editorial-providers.mjs";

const token = process.env.TMDB_ACCESS_TOKEN;
if (!token) throw new Error("TMDB_ACCESS_TOKEN is required.");
const database = process.env.APPWRITE_DATABASE_ID || "brisastory";
const collection = process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID || "editorial_content";
const now = new Date();
const publishAt = now.toISOString();
const expireAt = new Date(now.getTime() + 7 * 86400000).toISOString();
const editionKey = `live-refresh-${publishAt.slice(0, 10)}`;

const [movies, shows, anime, songs] = await Promise.all([
  fetchTmdb("movie", token), fetchTmdb("tv", token), fetchAniList(), fetchListenBrainz(),
]);
const screen = [
  ...movies.slice(0, 3).map((item, index) => ({ ...item, type: "movie", slot: "on_screen_movie", displayOrder: index + 1 })),
  ...shows.filter((item) => !item.genres?.includes("16")).slice(0, 3).map((item, index) => ({ ...item, type: "tv", slot: "on_screen_tv", displayOrder: index + 1 })),
  ...anime.slice(0, 3).map((item, index) => ({ ...item, type: "anime", slot: "on_screen_anime", displayOrder: index + 1 })),
];
const artwork = [
  "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02ebefdcb9f6e825e8582bbac4",
  "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02c758ab1605889baf5cccb4af",
  "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ff163890a7e96a400bc40b8a",
  "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0251a4a901f719f8293ab3e2ac",
  "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0229965e151471630b1869ba5e",
];
const blockedArtists = /\b(bts|agust d|jimin|rm|j hope|j-hope|jung kook|jungkook|v|jin)\b/i;
const diverseSongs = songs.filter((item, index, all) => !blockedArtists.test(item.subtitle) && all.findIndex((candidate) => candidate.subtitle.toLowerCase() === item.subtitle.toLowerCase()) === index).slice(0, 5);
const fallbackSongs = [
  { title: "Lover Boy", subtitle: "Phum Viphurit", externalId: "2rd4FH1cSaWGc0ZiUaMbX9" },
  { title: "Fun!", subtitle: "Special Features", externalId: "2BjDgOYaVX5xdNi8DFV6UW" },
  { title: "Draw You Out", subtitle: "Noah Kahan", externalId: "5KTcGJKm4HgLhLt8Tc7EQ5" },
  { title: "Too Cute To Be Lonely", subtitle: "Holly Humberstone", externalId: "5iZbOxJZ2Rmo2ECMXRHU9a" },
  { title: "Tongue", subtitle: "Fontaines D.C.", externalId: "1XzQ57ONjIpRYB878VuGnF" },
];
const selectedSongs = diverseSongs.length >= 5 ? diverseSongs : fallbackSongs;
const music = selectedSongs.map((item, index) => ({
  id: `latest-${index + 1}-${item.externalId}`, artist: item.subtitle, track: item.title,
  artwork: artwork[index], spotifyUrl: item.externalId.length === 22 ? `https://open.spotify.com/track/${item.externalId}` : `https://open.spotify.com/search/${encodeURIComponent(`${item.title} ${item.subtitle}`)}`,
  youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.artist} ${item.title}`)}`,
  editorNote: "A current discovery from this week's listening activity.", week: publishAt.slice(0, 10),
}));

const db = new Databases(new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));
for (const slot of ["on_screen_movie", "on_screen_tv", "on_screen_anime", "on_repeat_music"]) {
  const old = await db.listDocuments(database, collection, [Query.equal("slot", slot), Query.limit(100)]);
  for (const row of old.documents) if (["scheduled", "published"].includes(row.status)) await db.updateDocument(database, collection, row.$id, { status: "archived" });
}
async function upsert(item) {
  if (Array.isArray(item.genres)) item = { ...item, genres: item.genres.join(",") };
  const found = await db.listDocuments(database, collection, [Query.equal("externalId", item.externalId), Query.limit(1)]);
  if (found.documents[0]) return db.updateDocument(database, collection, found.documents[0].$id, item);
  return db.createDocument(database, collection, ID.unique(), item);
}
for (const item of screen) await upsert({ ...item, editionKey, publishAt, expireAt, status: "scheduled", payload: JSON.stringify(item) });
for (const [index, item] of music.entries()) await upsert({ type: "music", slot: "on_repeat_music", externalId: item.id, title: item.track, subtitle: item.artist, imageUrl: item.artwork, destinationUrl: item.spotifyUrl, editionKey, displayOrder: index + 1, publishAt, expireAt, status: "scheduled", payload: JSON.stringify(item) });
await writeFile("content/music.json", `${JSON.stringify(music, null, 2)}\n`);
console.log(JSON.stringify({ editionKey, screen: screen.map((item) => item.title), music: music.map((item) => `${item.track} — ${item.artist}`) }, null, 2));
