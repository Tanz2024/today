import "server-only";
import music from "@/content/music.json";
export type MusicEntry = (typeof music)[number];
export function getMusic() { return music; }

// The current week's picks — the week with the most recent date in the file.
// Falls back to the full list if no `week` field is present on any entry.
export function getLatestWeekMusic(): MusicEntry[] {
  const weeks = music.map((entry) => entry.week).filter(Boolean) as string[];
  if (weeks.length === 0) return music;
  const latest = weeks.reduce((a, b) => (b > a ? b : a));
  const latestEntries = music.filter((entry) => entry.week === latest);
  // Never hand the homepage an empty/incomplete chart while editorial data is
  // being refreshed. The weekly catalogue is still Spotify-backed and gives
  // the component a usable five-track fallback.
  return latestEntries.length >= 5 ? latestEntries : music.slice(0, 5);
}

/** Pick a stable-but-changing order for the current weekly catalogue. */
export function getShuffledLatestWeekMusic(now = new Date()): MusicEntry[] {
  const source = getLatestWeekMusic().slice();
  const weekKey = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
  let seed = Array.from(weekKey).reduce((total, character) => total * 31 + character.charCodeAt(0), 7);
  return source.sort(() => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) - 0.5;
  });
}

export function getYouTubeUrl(entry: MusicEntry) {
  return entry.youtubeUrl.startsWith("https://www.youtube.com/")
    ? entry.youtubeUrl
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${entry.artist} ${entry.track}`)}`;
}

function spotifyTrackId(url: string) {
  const match = url.match(/spotify\.com\/track\/([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

type SpotifyToken = { value: string; expiresAt: number };
type SpotifyMetadata = { artwork?: string; spotifyTitle?: string; spotifyUrl?: string };

let cachedSpotifyToken: SpotifyToken | null = null;
let spotifyTokenRequest: Promise<string | null> | null = null;
const spotifyTrackCache = new Map<string, { metadata: SpotifyMetadata; expiresAt: number }>();
const spotifyTrackRequests = new Map<string, Promise<SpotifyMetadata | null>>();
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const SPOTIFY_CACHE_MS = 3600 * 1000;

async function requestSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresInMs = Math.max(0, Number(data.expires_in ?? 3600) * 1000);
  cachedSpotifyToken = { value: data.access_token, expiresAt: Date.now() + expiresInMs };
  return data.access_token;
}

async function spotifyAccessToken() {
  if (cachedSpotifyToken && cachedSpotifyToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) return cachedSpotifyToken.value;
  if (!spotifyTokenRequest) {
    spotifyTokenRequest = requestSpotifyAccessToken().finally(() => { spotifyTokenRequest = null; });
  }
  return spotifyTokenRequest;
}

async function resolveSpotifyMetadata(id: string, spotifyUrl: string): Promise<SpotifyMetadata | null> {
  const cached = spotifyTrackCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.metadata;
  const inFlight = spotifyTrackRequests.get(id);
  if (inFlight) return inFlight;

  const request = (async () => {
    const token = await spotifyAccessToken();
    if (token) {
      const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      });
      if (response.ok) {
        const data = (await response.json()) as { name?: string; album?: { images?: Array<{ url: string }> } };
        const metadata = { artwork: data.album?.images?.[0]?.url, spotifyTitle: data.name, spotifyUrl };
        spotifyTrackCache.set(id, { metadata, expiresAt: Date.now() + SPOTIFY_CACHE_MS });
        return metadata;
      }
    }

    const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const data = (await response.json()) as { thumbnail_url?: string; title?: string };
    const metadata = { artwork: data.thumbnail_url, spotifyTitle: data.title, spotifyUrl };
    spotifyTrackCache.set(id, { metadata, expiresAt: Date.now() + SPOTIFY_CACHE_MS });
    return metadata;
  })().finally(() => { spotifyTrackRequests.delete(id); });
  spotifyTrackRequests.set(id, request);
  return request;
}

export async function resolveMusic(entry: MusicEntry) {
  try {
    let spotifyUrl = entry.spotifyUrl;
    let id = spotifyTrackId(spotifyUrl);
    if (!id) {
      const token = await spotifyAccessToken();
      if (!token) return entry;
      const response = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(`track:${entry.track} artist:${entry.artist}`)}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      });
      if (!response.ok) return entry;
      const data = (await response.json()) as { tracks?: { items?: Array<{ id?: string; name?: string; external_urls?: { spotify?: string }; album?: { images?: Array<{ url: string }> } }> } };
      const track = data.tracks?.items?.[0];
      if (!track?.id || !track.external_urls?.spotify) return entry;
      id = track.id;
      spotifyUrl = track.external_urls.spotify;
    }
    if (!id) return entry;
    const metadata = await resolveSpotifyMetadata(id, spotifyUrl);
    return metadata ? { ...entry, artwork: metadata.artwork ?? entry.artwork, spotifyTitle: metadata.spotifyTitle, spotifyUrl: metadata.spotifyUrl ?? spotifyUrl } : entry;
  } catch {
    return entry;
  }
}
