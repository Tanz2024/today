import { cronFetch } from "./cron-fetch.mjs";

async function json(url, options = {}) {
  const response = await cronFetch(url, options, 12_000);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export function buildProviderEditorNote(item) {
  if (typeof item.editorNote === "string" && item.editorNote.trim()) return item.editorNote.trim();
  const rank = Number.isFinite(Number(item.sourceRank)) && Number(item.sourceRank) > 0 ? `, ranked #${Number(item.sourceRank)}` : "";
  if (item.source === "tmdb" && item.type === "movie") return `A movie surfaced by TMDB's global trend data${rank}.`;
  if (item.source === "tmdb" && item.type === "tv") return `A television title surfaced by TMDB's global trend data${rank}.`;
  if (item.source === "anilist" && item.type === "anime") return `An anime title surfaced by AniList's trend data${rank}.`;
  return undefined;
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

export function normalizeCandidates(batches) {
  const seen = new Set();
  return batches.flat().filter((item) => item.title && !seen.has(`${item.source}:${item.externalId}`) && seen.add(`${item.source}:${item.externalId}`)).map((item) => ({ ...item, editorNote: buildProviderEditorNote(item), status: "candidate", discoveredAt: new Date().toISOString(), brisaScore: Number((1 / Math.max(1, item.sourceRank ?? 20)).toFixed(4)) }));
}
