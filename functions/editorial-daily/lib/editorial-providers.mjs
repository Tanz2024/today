const TMDB = "https://api.themoviedb.org/3";
import crypto from "node:crypto";
import { cronFetch } from "./cron-fetch.mjs";

async function json(url, options = {}) {
  const response = await cronFetch(url, options, 12_000);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function image(path) { return path ? `https://image.tmdb.org/t/p/w780${path}` : undefined; }

export async function fetchTmdb(type, token) {
  if (!token) return [];
  const path = type === "movie" ? "/trending/movie/week" : "/trending/tv/week";
  const data = await json(`${TMDB}${path}`, { headers: { Authorization: `Bearer ${token}`, accept: "application/json" } });
  return (data.results ?? []).map((item, index) => ({
    type, slot: type === "movie" ? "on_screen_movie" : "on_screen_tv", externalId: String(item.id),
    title: item.title ?? item.name ?? "", description: item.overview, imageUrl: image(item.poster_path),
    source: "tmdb", sourceUrl: `https://www.themoviedb.org/${type}/${item.id}`, sourceRank: index + 1,
    sourceScore: Number(item.popularity ?? 0), releaseDate: item.release_date ?? item.first_air_date,
  }));
}

export async function fetchAniList() {
  const data = await json("https://graphql.anilist.co", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "query { Page(perPage: 20) { media(type: ANIME, sort: TRENDING_DESC) { id title { romaji english } description coverImage { large } startDate { year month day } popularity genres siteUrl } } }" }) });
  return (data.data?.Page?.media ?? []).map((item, index) => ({
    type: "anime", slot: "on_screen_anime", externalId: String(item.id), title: item.title?.english ?? item.title?.romaji ?? "",
    description: item.description?.replace(/<[^>]+>/g, ""), imageUrl: item.coverImage?.large, source: "anilist",
    sourceUrl: item.siteUrl, sourceRank: index + 1, sourceScore: Number(item.trending ?? item.popularity ?? 0),
    releaseDate: item.startDate?.year ? `${item.startDate.year}-${String(item.startDate.month ?? 1).padStart(2, "0")}-${String(item.startDate.day ?? 1).padStart(2, "0")}` : undefined,
    genres: item.genres,
  }));
}

export async function fetchIgdb() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const secret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !secret) return [];
  const token = await json("https://id.twitch.tv/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "client_credentials" }) });
  const data = await cronFetch("https://api.igdb.com/v4/games", { method: "POST", headers: { "Client-ID": clientId, Authorization: `Bearer ${token.access_token}`, "Content-Type": "text/plain" }, body: "fields name,summary,cover.url,popularity,first_release_date,genres.name,url; sort popularity desc; limit 20;" }, 12_000);
  if (!data.ok) throw new Error(`${data.status} ${data.statusText}`);
  return (await data.json()).map((item, index) => ({ type: "game", slot: "on_screen_game", externalId: String(item.id), title: item.name, description: item.summary, imageUrl: item.cover?.url?.replace("t_thumb", "t_cover_big"), source: "igdb", sourceUrl: item.url, sourceRank: index + 1, sourceScore: Number(item.popularity ?? 0), genres: item.genres?.map((genre) => genre.name), releaseDate: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString().slice(0, 10) : undefined }));
}

function appleToken() {
  const team = process.env.APPLE_MUSIC_TEAM_ID, key = process.env.APPLE_MUSIC_KEY_ID, raw = process.env.APPLE_MUSIC_PRIVATE_KEY;
  if (!team || !key || !raw) return null;
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: key, typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: team, iat: now, exp: now + 86400 })).toString("base64url");
  const input = `${header}.${payload}`;
  const signature = crypto.createSign("SHA256").update(input).sign({ key: raw.replace(/\\n/g, "\n"), dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${input}.${signature}`;
}

export async function fetchAppleMusic() {
  const token = appleToken();
  if (!token) return [];
  const data = await json("https://api.music.apple.com/v1/catalog/my/charts?types=songs&limit=25", { headers: { Authorization: `Bearer ${token}` } });
  const songs = data.results?.songs ?? [];
  return songs.flatMap((chart) => (chart.data ?? []).map((item, index) => ({
    type: "music", slot: "on_repeat_music", externalId: `apple-${item.id}`, title: item.attributes?.name ?? "", subtitle: item.attributes?.artistName ?? "",
    description: item.attributes?.albumName, imageUrl: item.attributes?.artwork?.url?.replace("{w}", "600").replace("{h}", "600"), destinationUrl: item.attributes?.url,
    source: "apple_music", sourceUrl: item.attributes?.url, sourceRank: index + 1, sourceScore: Number(item.attributes?.contentRating === "explicit" ? 0.9 : 1), releaseDate: item.attributes?.releaseDate,
  })));
}

export function cleanMusicText(value) { return String(value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(feat|ft|featuring)\b.*$/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function clean(value) { return cleanMusicText(value); }
export function scoreSpotifyMatch(candidate, track) {
  const artist = clean(candidate.subtitle), title = clean(candidate.title);
  const spotifyArtist = clean(track.artists?.[0]?.name), spotifyTitle = clean(track.name);
  if (!artist || !title || !spotifyArtist || !spotifyTitle) return 0;
  const artistExact = artist === spotifyArtist;
  const titleExact = title === spotifyTitle;
  const artistClose = artistExact || spotifyArtist.includes(artist) || artist.includes(spotifyArtist);
  const titleClose = titleExact || spotifyTitle.includes(title) || title.includes(spotifyTitle);
  if (artistExact && titleExact) return 1;
  if (artistClose && titleClose) return 0.9;
  return 0;
}
export function isCanonicalSpotifyTrack(candidate, track) {
  const spotifyTitle = clean(track.name);
  const requested = clean(candidate.title);
  if (!spotifyTitle || !requested) return false;
  if (requested.includes("live") || requested.includes("remix") || requested.includes("karaoke") || requested.includes("instrumental") || requested.includes("acoustic") || requested.includes("sped up") || requested.includes("slowed")) return true;
  return !/\b(live|remix|karaoke|instrumental|acoustic|sped up|slowed|radio edit)\b/i.test(track.name ?? "");
}
function listenId(item) { return item.recording_mbid || `listenbrainz-${clean(item.track_name)}-${clean(item.artist_name)}`; }

export function normalizeListenBrainz(items, previousById = new Map(), metadata = {}, previousMetadata = {}) {
  const seen = new Set();
  const rows = (items ?? []).map((item, index) => ({
    type: "music", slot: "on_repeat_music", externalId: listenId(item), title: item.track_name?.trim() ?? "", subtitle: item.artist_name?.trim() ?? "",
    source: "listenbrainz", sourceRank: index + 1, sourceScore: Number(item.listen_count ?? 0), sourceUrl: item.recording_mbid ? `https://musicbrainz.org/recording/${item.recording_mbid}` : undefined,
    releaseDate: item.release_date, currentWeeklyListens: Number(item.listen_count ?? 0), previousWeeklyListens: previousById.get(listenId(item))?.listen_count === undefined ? undefined : Number(previousById.get(listenId(item)).listen_count), sourceProvider: "listenbrainz", sourceRange: "this_week", sourcePeriodStart: metadata.from_ts ? new Date(metadata.from_ts * 1000).toISOString() : undefined, sourcePeriodEnd: metadata.to_ts ? new Date(metadata.to_ts * 1000).toISOString() : undefined, sourceLastUpdated: metadata.last_updated ? new Date(metadata.last_updated * 1000).toISOString() : undefined, previousPeriodStart: previousMetadata.from_ts ? new Date(previousMetadata.from_ts * 1000).toISOString() : undefined, previousPeriodEnd: previousMetadata.to_ts ? new Date(previousMetadata.to_ts * 1000).toISOString() : undefined, previousLastUpdated: previousMetadata.last_updated ? new Date(previousMetadata.last_updated * 1000).toISOString() : undefined, generatedAt: new Date().toISOString(), payload: item,
  })).filter((item) => item.title && item.subtitle).filter((item) => { const key = `${clean(item.subtitle)}:${clean(item.title)}`; if (seen.has(key) || seen.has(item.externalId)) return false; seen.add(key); seen.add(item.externalId); return true; });
  const max = Math.max(...rows.map((item) => item.sourceScore), 1);
  return rows.map((item) => ({ ...item, brisaScore: Number((item.sourceScore / max).toFixed(4)) }));
}

const listenBrainzWait = (attempt) => new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));

export async function fetchListenBrainz() {
  const headers = { accept: "application/json", "user-agent": "BrisaStory/1.0 (editorial discovery)" };
  const responses = {};
  for (const range of ["this_week", "week"]) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await cronFetch(`https://api.listenbrainz.org/1/stats/sitewide/recordings?range=${range}&count=50`, { headers }, 12_000);
        if (response.status === 204) break;
        const contentType = response.headers.get("content-type") ?? "";
        const temporary = response.status === 429 || response.status >= 500;
        if (!response.ok) throw new Error(`ListenBrainz HTTP ${response.status}${temporary ? " (temporary)" : ""}`);
        if (!contentType.toLowerCase().includes("json")) throw new Error("ListenBrainz returned non-JSON content");
        const data = await response.json();
        const rows = data.payload?.recordings ?? data.recordings ?? [];
        if (!Array.isArray(rows)) throw new Error("ListenBrainz returned malformed recordings data");
        if (rows.length) { responses[range] = { rows, metadata: data.payload ?? data }; break; }
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await listenBrainzWait(attempt);
      }
    }
    if (lastError) throw new Error(`ListenBrainz failed after 3 attempts: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
  }
  const current = responses.this_week;
  if (!current) return [];
  const previousById = new Map((responses.week?.rows ?? []).map((item) => [listenId(item), item]));
  return normalizeListenBrainz(current.rows, previousById, current.metadata, responses.week?.metadata ?? {});
}

export async function fetchGlobalPicks() {
  const key = process.env.FOURSQUARE_API_KEY?.trim();
  if (!key) return [];
  console.log("Foursquare credentials: configured");
  const cities = ["Tokyo, Japan", "Seoul, South Korea", "Bangkok, Thailand", "Kuala Lumpur, Malaysia", "Amsterdam, Netherlands", "Melbourne, Australia"];
  const results = [];
  for (const city of cities) {
    const response = await cronFetch(`https://places-api.foursquare.com/places/search?near=${encodeURIComponent(city)}&limit=10`, { headers: { Authorization: `Bearer ${key}`, "X-Places-Api-Version": "2025-06-17", Accept: "application/json" } }, 12_000);
    if (!response.ok) throw new Error(`Foursquare ${response.status}`);
    if (!results.length) console.log(`Foursquare auth: success\nHTTP status: ${response.status}`);
    const data = await response.json();
    for (const [index, place] of (data.results ?? []).entries()) {
      const category = place.categories?.[0];
      const placeId = place.fsq_place_id ?? place.fsq_id;
      const latitude = place.latitude ?? place.geocodes?.main?.latitude;
      const longitude = place.longitude ?? place.geocodes?.main?.longitude;
      const cityName = place.location?.locality ?? city.split(",")[0];
      const country = place.location?.country;
      if (!place.name || !cityName || !placeId || !category) continue;
      results.push({ type: "metro_pick", slot: "metro_pick", externalId: String(placeId), title: place.name, source: "foursquare", sourceUrl: place.website ?? `https://foursquare.com/v/${placeId}`, sourceRank: index + 1, sourceScore: Number(place.popularity ?? 0), payload: { name: place.name, city: cityName, country, category: category.name, address: place.location?.formatted_address, website: place.website, tel: place.tel, latitude, longitude, provider: "foursquare", providerId: placeId, sourceUrl: place.website ?? `https://foursquare.com/v/${placeId}` } });
    }
  }
  return results;
}

export function normalizeCandidates(batches) {
  const seen = new Set();
  return batches.flat().filter((item) => item.title && !seen.has(`${item.source}:${item.externalId}`) && seen.add(`${item.source}:${item.externalId}`)).map((item) => ({ ...item, status: "candidate", discoveredAt: new Date().toISOString(), brisaScore: Number((1 / Math.max(1, item.sourceRank ?? 20)).toFixed(4)) }));
}
