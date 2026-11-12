import { Client, Databases, ID, Query } from "node-appwrite";
import { fetchAniList, fetchGlobalPicks, fetchIgdb, fetchListenBrainz, fetchTmdb, normalizeCandidates, scoreSpotifyMatch, isCanonicalSpotifyTrack } from "./editorial-providers.mjs";
import { generateWeeklyQuestion } from "./editorial-weekly-question.mjs";

export function existingEditorialNote(record) {
  if (typeof record?.editorNote === "string" && record.editorNote.trim()) return record.editorNote.trim();
  const payload = typeof record?.payload === "string" ? (() => { try { return JSON.parse(record.payload); } catch { return null; } })() : record?.payload;
  return typeof payload?.editorNote === "string" && payload.editorNote.trim() ? payload.editorNote.trim() : undefined;
}

export function toEditorialDocument(item, status = item.status, preservedNote) {
  const { spotifyId, spotifyUrl, youtubeUrl, ...sourceItem } = { ...item, ...(preservedNote ? { editorNote: preservedNote } : {}) };
  void spotifyId; void youtubeUrl;
  const schemaItem = Object.fromEntries(Object.entries({
    type: sourceItem.type, externalId: sourceItem.externalId, title: sourceItem.title,
    subtitle: sourceItem.subtitle, description: sourceItem.description, imageUrl: sourceItem.imageUrl,
    destinationUrl: spotifyUrl ?? sourceItem.destinationUrl, source: sourceItem.source,
    sourceUrl: sourceItem.sourceUrl, sourceRank: sourceItem.sourceRank, sourceScore: sourceItem.sourceScore,
    region: sourceItem.region, genres: Array.isArray(sourceItem.genres) ? sourceItem.genres.join(",") : sourceItem.genres,
    releaseDate: sourceItem.releaseDate, discoveredAt: sourceItem.discoveredAt, brisaScore: sourceItem.brisaScore,
    manualBoost: sourceItem.manualBoost, repeatPenalty: sourceItem.repeatPenalty, diversityKey: sourceItem.diversityKey,
    status, publishAt: sourceItem.publishAt, expireAt: sourceItem.expireAt, slot: sourceItem.slot,
    editionKey: sourceItem.editionKey, displayOrder: sourceItem.displayOrder, editorOverride: sourceItem.editorOverride,
    editorNote: sourceItem.editorNote, createdAt: sourceItem.createdAt, updatedAt: sourceItem.updatedAt,
    payload: JSON.stringify({ ...sourceItem, status }),
  }).filter(([, value]) => value !== undefined));
  return schemaItem;
}
import { createExecutionBudget } from "./execution-budget.mjs";
import { cronFetch } from "./cron-fetch.mjs";

export function getNextMalaysiaMondayBoundary(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const currentDay = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  const daysUntilMonday = (8 - currentDay.getUTCDay()) % 7 || 7;
  const nextMonday = new Date(currentDay); nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  const publishAt = new Date(Date.UTC(nextMonday.getUTCFullYear(), nextMonday.getUTCMonth(), nextMonday.getUTCDate() - 1, 16));
  const expireAt = new Date(publishAt); expireAt.setUTCDate(expireAt.getUTCDate() + 7);
  return { dateKey: nextMonday.toISOString().slice(0, 10), publishAt: publishAt.toISOString(), expireAt: expireAt.toISOString() };
}

async function spotifyMatches(items) {
  const id = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return { items: [], status: "missing" };
  const tokenResponse = await cronFetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }, 10_000);
  if (!tokenResponse.ok) return { items: [], status: `failed (${tokenResponse.status})` };
  const token = (await tokenResponse.json()).access_token;
  const matched = [];
  for (const item of items) {
    const response = await cronFetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${item.title} artist:${item.subtitle}`)}&type=track&limit=1`, { headers: { Authorization: `Bearer ${token}` } }, 10_000);
    if (!response.ok) continue;
    const track = (await response.json()).tracks?.items?.[0];
    if (track?.external_urls?.spotify && scoreSpotifyMatch(item, track) >= 0.9 && isCanonicalSpotifyTrack(item, track)) matched.push({ ...item, spotifyId: track.id, spotifyUrl: track.external_urls.spotify, youtubeUrl: track.external_urls.spotify, imageUrl: track.album?.images?.[0]?.url ?? item.imageUrl, releaseDate: track.album?.release_date ?? item.releaseDate, releaseDatePrecision: track.album?.release_date_precision ?? item.releaseDatePrecision });
  }
  return { items: matched, status: "success" };
}

export function calculatePeriodMomentum(item, now = new Date()) {
  const currentStart = item.sourcePeriodStart ? new Date(item.sourcePeriodStart) : null;
  const currentEnd = item.sourcePeriodEnd ? new Date(item.sourcePeriodEnd) : null;
  const previousStart = item.previousPeriodStart ? new Date(item.previousPeriodStart) : null;
  const previousEnd = item.previousPeriodEnd ? new Date(item.previousPeriodEnd) : null;
  const currentPeriodHours = currentStart && currentEnd ? Math.max(0, (currentEnd.getTime() - currentStart.getTime()) / 3600000) : undefined;
  const previousPeriodHours = previousStart && previousEnd ? Math.max(0, (previousEnd.getTime() - previousStart.getTime()) / 3600000) : undefined;
  const current = Number(item.currentWeeklyListens ?? item.sourceScore ?? 0);
  const previous = item.previousWeeklyListens;
  const currentUpdated = item.sourceLastUpdated ? new Date(item.sourceLastUpdated).getTime() : undefined;
  const stale = !currentUpdated || now.getTime() - currentUpdated > 48 * 3600000;
  const rawCountGrowth = previous === undefined || previous === null || previous === 0 ? undefined : (current - Number(previous)) / Number(previous);
  if (previous === undefined || previous === null || !currentPeriodHours || !previousPeriodHours || stale) return { currentPeriodHours, previousPeriodHours, rawCountGrowth, normalizedGrowth: undefined, currentListenRate: undefined, previousListenRate: undefined, momentumMethod: "unavailable" };
  const approximatelyEqual = Math.abs(currentPeriodHours - previousPeriodHours) / previousPeriodHours <= 0.1;
  if (approximatelyEqual) return { currentPeriodHours, previousPeriodHours, rawCountGrowth, normalizedGrowth: rawCountGrowth, currentListenRate: current / currentPeriodHours, previousListenRate: Number(previous) / previousPeriodHours, momentumMethod: "full-period-comparison" };
  const currentListenRate = current / currentPeriodHours;
  const previousListenRate = Number(previous) / previousPeriodHours;
  return { currentPeriodHours, previousPeriodHours, rawCountGrowth, normalizedGrowth: previousListenRate === 0 ? undefined : (currentListenRate - previousListenRate) / previousListenRate, currentListenRate, previousListenRate, momentumMethod: previousListenRate === 0 ? "unavailable" : "normalized-partial-period" };
}

export function calculateMusicScores(items, now = new Date()) {
  const max = Math.max(...items.map((item) => Number(item.currentWeeklyListens ?? item.sourceScore ?? 0)), 1);
  const momentumDiagnostics = items.map((item) => calculatePeriodMomentum(item, now));
  const rawMomentum = momentumDiagnostics.map((diagnostic) => diagnostic.normalizedGrowth === undefined ? 0 : Math.max(0, diagnostic.normalizedGrowth));
  const maxMomentum = Math.max(...rawMomentum, 1);
  return items.map((item, index) => {
    const current = Number(item.currentWeeklyListens ?? item.sourceScore ?? 0);
    const age = item.releaseDate ? Math.max(0, Math.floor((now.getTime() - new Date(item.releaseDate).getTime()) / 86400000)) : null;
    const freshness = age === null ? 0 : age <= 30 ? 1 : age <= 90 ? 0.6 : age <= 365 ? 0.2 : 0;
    const diagnostic = momentumDiagnostics[index];
    const momentum = diagnostic.normalizedGrowth === undefined ? 0 : rawMomentum[index] / maxMomentum;
    const currentStrength = current / max;
    const finalScore = 0.4 * currentStrength + 0.3 * momentum + 0.2 * freshness + 0.1;
    return { ...item, ...diagnostic, releaseAgeDays: age, currentStrengthScore: Number(currentStrength.toFixed(4)), momentumScore: Number(momentum.toFixed(4)), freshnessScore: freshness, finalScore: Number(finalScore.toFixed(4)), weeklyGrowthRate: diagnostic.normalizedGrowth === undefined ? undefined : Number(diagnostic.normalizedGrowth.toFixed(4)) };
  });
}

async function loadEditorialIndex(db, database, collection) {
  const byIdentity = new Map();
  const byEdition = new Map();
  let cursor;
  do {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await db.listDocuments(database, collection, queries);
    for (const row of page.documents) {
      if (row.externalId) byIdentity.set(`${row.source ?? ""}:${row.externalId}`, row);
      if (row.slot && row.editionKey && row.displayOrder !== undefined) byEdition.set(`${row.slot}:${row.editionKey}:${row.displayOrder}`, row);
    }
    cursor = page.documents.length === 100 ? page.documents.at(-1)?.$id : undefined;
  } while (cursor);
  return { byIdentity, byEdition };
}

export async function runEditorialWeekly({ dryRun = false, providerArg, budget = createExecutionBudget({ onExhausted: (details) => console.warn("[editorial-weekly] budget_exhausted", JSON.stringify(details)) }) } = {}) {
  const boundary = getNextMalaysiaMondayBoundary();
  const dateKey = boundary.dateKey;
  async function safely(name, fn) { try { return await fn(); } catch (cause) { console.warn(`[editorial-weekly] ${name} skipped: ${cause instanceof Error ? cause.message : "unknown error"}`); return []; } }
  const batches = [];
  if (!providerArg || providerArg === "tmdb") { batches.push(await safely("TMDB movies", () => fetchTmdb("movie", process.env.TMDB_ACCESS_TOKEN))); batches.push(await safely("TMDB TV", () => fetchTmdb("tv", process.env.TMDB_ACCESS_TOKEN))); }
  if (!providerArg || providerArg === "anilist") batches.push(await safely("AniList", fetchAniList));
  if (!providerArg || providerArg === "igdb") batches.push(await safely("IGDB", fetchIgdb));
  let listenBrainzFailed = false;
  if (!providerArg || providerArg === "listenbrainz") {
    try { batches.push(await fetchListenBrainz()); }
    catch (cause) { listenBrainzFailed = true; console.warn(`[editorial-weekly] ListenBrainz failed; music edition preserved: ${cause instanceof Error ? cause.message : "unknown error"}`); }
  }
  if (!providerArg || providerArg === "places") batches.push(await safely("Global Picks", fetchGlobalPicks));
  if (!budget.checkpoint("weekly-candidate-normalization")) return { dryRun, edition: dateKey, status: "budget-exhausted", picks: 0 };
  const candidates = normalizeCandidates(batches), limits = { movie: 3, tv: 3, anime: 3, game: 3, metro_pick: 4 };
  const picks = Object.entries(limits).flatMap(([type, limit]) => candidates.filter((item) => item.type === type).sort((a, b) => (b.brisaScore ?? 0) - (a.brisaScore ?? 0)).slice(0, limit).map((item, index) => ({ ...item, editionKey: `on-screen-${type}-${dateKey}`, displayOrder: index + 1, publishAt: boundary.publishAt, expireAt: boundary.expireAt })));
  const musicCandidates = candidates.filter((item) => item.type === "music");
  let spotifyResult;
  try { spotifyResult = await spotifyMatches(musicCandidates); } catch (cause) { console.warn(`[editorial-weekly] Spotify music matching skipped: ${cause instanceof Error ? cause.message : "unknown error"}`); spotifyResult = { items: [], status: "failed" }; }
  const displayableMusic = spotifyResult.items.filter((item) => item.title && item.subtitle && item.spotifyId && item.spotifyUrl && /^https:\/\/i\.scdn\.co\//.test(item.imageUrl ?? ""));
  const rankedMusic = calculateMusicScores(displayableMusic).sort((a, b) => b.finalScore - a.finalScore);
  // Persist a wider verified pool: On Repeat can show 10, while the
  // homepage still takes its first 5 and the daily Song Pick deliberately
  // chooses from the lower-ranked discoveries.
  const diverse = rankedMusic.filter((item, index, all) => all.slice(0, index).filter((candidate) => candidate.subtitle === item.subtitle).length < 2).slice(0, 10);
  const musicPicks = diverse.map((item, index) => ({ ...item, editionKey: `music-${dateKey}`, displayOrder: index + 1, publishAt: boundary.publishAt, expireAt: boundary.expireAt }));
  picks.push(...musicPicks);
  const placePicks = picks.filter((item) => item.type === "metro_pick").map((item, index) => ({ ...item, editionKey: `global-picks-${dateKey}`, displayOrder: index + 1, publishAt: boundary.publishAt, expireAt: boundary.expireAt }));
  let weeklyQuestion = null;
  if (budget.checkpoint("weekly-question-generation")) try { weeklyQuestion = await generateWeeklyQuestion(); } catch (cause) { console.warn(`[editorial-weekly] weekly question skipped: ${cause instanceof Error ? cause.message : "unknown error"}`); }
  const weeklyItem = weeklyQuestion ? { type: "weekly_question", slot: "weekly_question", source: "openrouter", externalId: `weekly-question-${dateKey}`, title: weeklyQuestion.question, description: weeklyQuestion.shortAnswer, editionKey: `weekly-question-${dateKey}`, displayOrder: 1, publishAt: boundary.publishAt, expireAt: boundary.expireAt, status: "scheduled", payload: weeklyQuestion } : null;
  const scheduledPicks = [...picks.filter((item) => item.type !== "metro_pick"), ...placePicks, ...(weeklyItem ? [weeklyItem] : [])];
  const summary = { dryRun, edition: dateKey, publishAt: boundary.publishAt, expireAt: boundary.expireAt, candidates: candidates.length, picks: picks.length, globalPicks: { candidates: candidates.filter((item) => item.type === "metro_pick").length, selected: placePicks.length, editionKey: `global-picks-${dateKey}` }, spotifyCredentials: process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET ? "configured" : "missing", spotifyAuth: spotifyResult?.status ?? "missing", music: { listenBrainzFetched: musicCandidates.length, valid: musicCandidates.filter((item) => item.title && item.subtitle).length, spotifyMatched: displayableMusic.length, sourceProvider: musicPicks[0]?.sourceProvider ?? "listenbrainz", sourceRange: musicPicks[0]?.sourceRange ?? "this_week", sourcePeriodStart: musicPicks[0]?.sourcePeriodStart, sourcePeriodEnd: musicPicks[0]?.sourcePeriodEnd, generatedAt: musicPicks[0]?.generatedAt, top: musicPicks.map((item) => ({ track: item.title, artist: item.subtitle, releaseDate: item.releaseDate, currentPeriodStart: item.sourcePeriodStart, currentPeriodEnd: item.sourcePeriodEnd, currentPeriodHours: item.currentPeriodHours, previousPeriodStart: item.previousPeriodStart, previousPeriodEnd: item.previousPeriodEnd, previousPeriodHours: item.previousPeriodHours, currentWeeklyListens: item.currentWeeklyListens, previousWeeklyListens: item.previousWeeklyListens, currentListenRate: item.currentListenRate, previousListenRate: item.previousListenRate, rawCountGrowth: item.rawCountGrowth, normalizedGrowth: item.normalizedGrowth, momentumMethod: item.momentumMethod, freshnessScore: item.freshnessScore, momentumScore: item.momentumScore, finalScore: item.finalScore, selectionReason: item.momentumMethod === "unavailable" ? "current activity; momentum unavailable" : item.momentumScore > 0.5 ? "strong weekly momentum" : "strong current weekly activity" })), editionKey: `music-${dateKey}`, count: musicPicks.length }, igdb: Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET) };
  if (listenBrainzFailed || musicPicks.length < 4) return { ...summary, weeklyQuestion: weeklyQuestion ? "generated-but-not-published" : "preserved-current-edition", musicPublication: "preserved-current-edition" };
  if (dryRun || !budget.checkpoint("weekly-appwrite-writes")) return { ...summary, documents: dryRun ? scheduledPicks : [], ...(dryRun ? {} : { status: "budget-exhausted" }) };
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required for write mode");
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const musicEdition = `music-${dateKey}`;
  const musicRows = await db.listDocuments(database, collection, [Query.equal("slot", "on_repeat_music"), Query.equal("editionKey", musicEdition), Query.limit(100)]);
  const selectedMusicIds = new Set(musicPicks.map((item) => item.externalId));
  for (const row of musicRows.documents) {
    if (row.source === null && row.status === "scheduled" && !selectedMusicIds.has(row.externalId)) {
      await db.updateDocument(database, collection, row.$id, { status: "archived" });
    }
  }
  const editorialIndex = await loadEditorialIndex(db, database, collection);
  for (const item of candidates) {
    const identity = `${item.source ?? ""}:${item.externalId}`;
    const current = editorialIndex.byIdentity.get(identity);
    const protectedState = current && ["approved", "scheduled", "published"].includes(current.status);
    const data = toEditorialDocument(item, protectedState ? current.status : item.status, protectedState ? existingEditorialNote(current) : undefined);
    if (current) editorialIndex.byIdentity.set(identity, await db.updateDocument(database, collection, current.$id, data));
    else editorialIndex.byIdentity.set(identity, await db.createDocument(database, collection, ID.unique(), data));
  }
  for (const item of scheduledPicks) {
    const editionIdentity = `${item.slot}:${item.editionKey}:${item.displayOrder}`;
    if (editorialIndex.byEdition.has(editionIdentity)) continue;
    const existing = editorialIndex.byIdentity.get(`${item.source ?? ""}:${item.externalId}`);
    if (existing && ["approved", "scheduled", "published"].includes(existing.status)) continue;
    if (existing) {
      const updated = await db.updateDocument(database, collection, existing.$id, toEditorialDocument(item, "scheduled", existingEditorialNote(existing)));
      editorialIndex.byIdentity.set(`${item.source ?? ""}:${item.externalId}`, updated);
      editorialIndex.byEdition.set(editionIdentity, updated);
    } else {
      const created = await db.createDocument(database, collection, ID.unique(), toEditorialDocument(item, "scheduled"));
      editorialIndex.byIdentity.set(`${item.source ?? ""}:${item.externalId}`, created);
      editorialIndex.byEdition.set(editionIdentity, created);
    }
  }
  return summary;
}
