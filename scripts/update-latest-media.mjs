import { writeFile } from "node:fs/promises";
import { fetchAniList, fetchTmdb } from "../functions/editorial-weekly/lib/editorial-providers.mjs";

const token = process.env.TMDB_ACCESS_TOKEN;
if (!token) throw new Error("Set TMDB_ACCESS_TOKEN before refreshing media.");

const [movies, shows, anime] = await Promise.all([
  fetchTmdb("movie", token),
  fetchTmdb("tv", token),
  fetchAniList(),
]);

const today = new Date().toISOString().slice(0, 10);
const items = [
  ...movies.slice(0, 3).map((item, index) => ({
    section: "Movies", rank: index + 1, title: item.title, platform: "TMDB", mediaType: "movie",
    tmdbId: Number(item.externalId), watchUrl: item.sourceUrl, editorNote: item.editorNote,
  })),
  ...shows.slice(0, 3).map((item, index) => ({
    section: "Trending TV", rank: index + 1, title: item.title, platform: "TMDB", mediaType: "series",
    tmdbId: Number(item.externalId), watchUrl: item.sourceUrl, editorNote: item.editorNote,
  })),
  ...anime.slice(0, 3).map((item, index) => ({
    section: "Anime", rank: index + 1, title: item.title, platform: "AniList", mediaType: "series",
    watchUrl: item.sourceUrl, posterOverride: item.imageUrl, editorNote: item.editorNote,
  })),
];

if (items.length !== 9) throw new Error(`Expected 9 current screen picks, received ${items.length}.`);

await writeFile("content/on-screen.json", `${JSON.stringify({
  region: "Global",
  week: today,
  source: "TMDB trending this week + AniList trending this week",
  sourceUrl: "https://www.themoviedb.org/trending/movie/week",
  items,
}, null, 2)}\n`);

console.log(`Updated ${items.length} movie, TV, and anime picks for ${today}.`);
console.log("Music was not rewritten: Spotify search is currently unavailable for the configured app.");
