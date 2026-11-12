import { Client, Databases, ID, Query } from "node-appwrite";
import dailyDrops from "../content/daily-drops.json" with { type: "json" };
import polls from "../content/polls.json" with { type: "json" };
import games from "../content/games.json" with { type: "json" };
import { collectDailyTrendPack, generateDailyEdition } from "./editorial-daily-ai.mjs";
import { fetchListenBrainz } from "./editorial-providers.mjs";
import { createExecutionBudget } from "./execution-budget.mjs";
import { cronFetch, isCronFetchTimeout } from "./cron-fetch.mjs";

const FALLBACK_TRIVIA = [
  { question: "Would you rather always be early or always be able to skip the queue?", options: ["Always early", "Skip the queue"] },
  { question: "Would you rather have a perfect playlist or a perfect weekend plan?", options: ["Perfect playlist", "Perfect weekend"] },
];
const FALLBACK_GROUP_CHAT = [
  "What is one small thing that made this week better?",
  "What are you currently recommending to everyone?",
];
const REQUIRED_DAILY_SLOTS = ["pulse", "daily_trivia", "group_chat_question", "this_or_that", "daily_drop"];
const PUBLISHABLE_STATUSES = new Set(["approved", "scheduled", "published"]);

function validateDailyEdition(rows, editionKey) {
  const receivedSlots = rows.map((row) => String(row.slot ?? ""));
  const counts = new Map();
  for (const slot of receivedSlots) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  const missingSlots = REQUIRED_DAILY_SLOTS.filter((slot) => !counts.has(slot));
  const duplicateSlots = REQUIRED_DAILY_SLOTS.filter((slot) => (counts.get(slot) ?? 0) > 1);
  const documentIds = rows.map((row) => row.$id).filter(Boolean);
  const invalidStatusDocumentIds = rows.filter((row) => !PUBLISHABLE_STATUSES.has(row.status)).map((row) => row.$id).filter(Boolean);
  const wrongEditionKeyDocumentIds = rows.filter((row) => row.editionKey !== editionKey).map((row) => row.$id).filter(Boolean);
  return {
    editionKey,
    expectedSlots: REQUIRED_DAILY_SLOTS,
    receivedSlots,
    missingSlots,
    duplicateSlots,
    documentIds,
    invalidStatusDocumentIds,
    wrongEditionKeyDocumentIds,
    valid: rows.length === REQUIRED_DAILY_SLOTS.length &&
      receivedSlots.every((slot) => REQUIRED_DAILY_SLOTS.includes(slot)) &&
      missingSlots.length === 0 && duplicateSlots.length === 0 &&
      invalidStatusDocumentIds.length === 0 && wrongEditionKeyDocumentIds.length === 0,
  };
}

function malaysiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now);
}

function dailyLog(event, details = {}) {
  // Keep operational context structured and never include credentials or raw
  // provider responses in logs.
  console.log(`[editorial-daily] ${event}`, JSON.stringify(details));
}

async function invalidatePublishedEditorialCaches(dateKey) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://brisastory.live";
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    dailyLog("cache_invalidation_skipped", { dateKey, reason: "CRON_SECRET missing" });
    return;
  }
  try {
    const response = await cronFetch(`${siteUrl}/api/revalidate-editorial`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    }, 8_000);
    dailyLog("cache_invalidation_completed", { dateKey, status: response.status, ok: response.ok });
  } catch (error) {
    dailyLog("cache_invalidation_failed", { dateKey, error: error instanceof Error ? error.message : "request failed" });
  }
}

function boundary(dateKey) {
  const publishAt = `${dateKey}T00:00:00+08:00`;
  const end = new Date(`${dateKey}T00:00:00+08:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { publishAt, expireAt: end.toISOString() };
}

function itemForToday(items, dateKey, make) {
  if (!items.length) return null;
  const index = Math.abs([...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % items.length;
  return make(items[index], index);
}

function dailySongPick(rows, dateKey) {
  const tracks = rows.flatMap((row) => {
    try {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      const artist = String(payload?.artist ?? row.subtitle ?? "").trim();
      const track = String(payload?.track ?? row.title ?? "").trim();
      const url = String(payload?.spotifyUrl ?? row.destinationUrl ?? "").trim();
      const genres = Array.isArray(payload?.genres) ? payload.genres.map(String) : [];
      return artist && track && url ? [{ artist, track, url, artwork: String(payload?.artwork ?? row.imageUrl ?? ""), genres, sourceRank: Number(payload?.sourceRank ?? row.sourceRank ?? 99) }] : [];
    } catch { return []; }
  });
  if (!tracks.length) return null;
  const recent = new Set(rows.filter((row) => new Date(row.publishAt ?? row.createdAt ?? row.$createdAt ?? 0).getTime() >= Date.now() - 90 * 86400000).map((row) => `${row.subtitle ?? row.artist}|${row.title ?? row.track}`.toLowerCase()));
  const fresh = tracks.filter((track) => !recent.has(`${track.artist}|${track.track}`.toLowerCase()));
  const source = fresh.length ? fresh : tracks;
  const headlineArtists = /^(bts|blackpink|jungkook|jung kook|taylor swift|drake|the weeknd|bad bunny|billie eilish|ariana grande|dua lipa|justin bieber|olivia rodrigo|sabrina carpenter|newjeans|twice|aespa|le sserafim)$/i;
  const underground = source.filter((track) => !headlineArtists.test(track.artist.trim()) && track.sourceRank >= 5);
  const genreTerms = /pop|hip.?hop|rap|k.?pop|global|indie|alternative/i;
  const genrePreferred = underground.filter((track) => genreTerms.test(track.genres.join(" ")));
  const pool = genrePreferred.length ? genrePreferred : underground.length ? underground : source.filter((track) => !headlineArtists.test(track.artist.trim()));
  if (!pool.length) return null;
  const index = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  return pool[index];
}

async function discoverySongPick(rows, dateKey, budget) {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const cutoff = Date.now() - 90 * 86400000;
  const currentTracks = new Set(rows.flatMap((row) => {
    try { const p = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; const date = new Date(row.publishAt ?? row.createdAt ?? row.$createdAt ?? 0).getTime(); return date >= cutoff ? [`${p?.artist ?? row.subtitle}|${p?.track ?? row.title}`.toLowerCase()] : []; } catch { return []; }
  }));
  const recentArtists = new Map();
  for (const row of rows) { try { const p = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; const date = new Date(row.publishAt ?? row.createdAt ?? row.$createdAt ?? 0).getTime(); if (date >= cutoff) { const artist = String(p?.artist ?? row.subtitle ?? "").toLowerCase(); recentArtists.set(artist, (recentArtists.get(artist) ?? 0) + 1); } } catch {} }
  try {
    const source = await fetchListenBrainz();
    const tokenResponse = await cronFetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" }, 10_000);
    if (!tokenResponse.ok) return null;
    const token = (await tokenResponse.json()).access_token;
    const headlineArtists = /^(bts|blackpink|jungkook|jung kook|taylor swift|drake|the weeknd|bad bunny|billie eilish|ariana grande|dua lipa|justin bieber|olivia rodrigo|sabrina carpenter|newjeans|twice|aespa|le sserafim)$/i;
    const candidates = source.filter((item) => Number(item.sourceRank ?? 0) >= 5 && !headlineArtists.test(String(item.subtitle).trim()) && !currentTracks.has(`${item.subtitle}|${item.title}`.toLowerCase()) && (recentArtists.get(String(item.subtitle).toLowerCase()) ?? 0) < 2);
    const matches = [];
    for (const item of candidates.slice(0, 10)) {
      if (budget && !budget.canStart(10_000)) break;
      let response;
      try { response = await cronFetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${item.title} artist:${item.subtitle}`)}&type=track&limit=1`, { headers: { Authorization: `Bearer ${token}` } }, 10_000); }
      catch (error) { if (isCronFetchTimeout(error)) console.warn("[editorial-daily] provider_timeout", JSON.stringify({ provider: "spotify", phase: "search", timeoutMs: 10_000 })); continue; }
      if (!response.ok) continue;
      const track = (await response.json()).tracks?.items?.[0];
      if (!track?.external_urls?.spotify || !track.album?.images?.[0]?.url) continue;
      const popularity = Number(track.popularity ?? 0);
      if (popularity > 65) continue;
      matches.push({ artist: item.subtitle, track: item.title, url: track.external_urls.spotify, artwork: track.album.images[0].url, popularity });
    }
    if (!matches.length) return null;
    const index = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0) % matches.length;
    return matches[index];
  } catch { return null; }
}

async function isPlayableSong(song) {
  if (!song?.url || !/^https:\/\/open\.spotify\.com\/track\//.test(song.url)) return false;
  try {
    const response = await cronFetch(song.url, { method: "HEAD", redirect: "follow" }, 8_000);
    return response.ok;
  } catch { return false; }
}

async function previousDailyQuestions() {
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) return [];
  try {
    const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
    const rows = await db.listDocuments(database, collection, [Query.equal("slot", "pulse"), Query.limit(30), Query.orderDesc("publishAt")]);
    return rows.documents.flatMap((row) => { try { const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; return [payload?.question, payload?.dailyDropQuestion].filter(Boolean); } catch { return []; } });
  } catch { return []; }
}

export async function runEditorialDaily({ dryRun = false, now = new Date(), budget = createExecutionBudget({ onExhausted: (details) => dailyLog("budget_exhausted", details) }) } = {}) {
  const dateKey = malaysiaDate(now);
  const { publishAt, expireAt } = boundary(dateKey);
  dailyLog("run_started", { dateKey, timezone: "Asia/Kuala_Lumpur", dryRun, publishAt, expireAt });
  const dailyEditionKey = `daily-interactive-${dateKey}`;
  const drop = itemForToday(dailyDrops, dateKey, (item) => ({ type: "daily_drop", slot: "daily_drop", externalId: `daily-drop-${dateKey}`, title: item.storyTitle, editionKey: dailyEditionKey, payload: item }));
  const poll = itemForToday(polls.filter((item) => item.active !== false), dateKey, (item) => ({ type: "poll", slot: "pulse", externalId: `pulse-${dateKey}`, title: item.question, editionKey: dailyEditionKey, payload: item }));
  const triviaSource = games.wouldYouRather?.length ? games.wouldYouRather : FALLBACK_TRIVIA;
  const trivia = itemForToday(triviaSource, dateKey, (item, index) => ({ type: "trivia", slot: "daily_trivia", externalId: `trivia-${dateKey}`, title: `Daily question ${index + 1}`, editionKey: dailyEditionKey, payload: { question: item.question ?? `Would you rather ${item.left} or ${item.right}?`, options: item.options ?? [item.left, item.right], correctAnswer: item.correctAnswer ?? item.options?.[0] ?? item.left, explanation: item.explanation ?? "There is no wrong answer — this one is for fun." } }));
  const chatGroups = Object.values(games.groupChat ?? {}).flat();
  const chatSource = chatGroups.length ? chatGroups : FALLBACK_GROUP_CHAT;
  const chat = itemForToday(chatSource, dateKey, (question) => ({ type: "group_chat_question", slot: "group_chat_question", externalId: `group-chat-${dateKey}`, title: question, editionKey: dailyEditionKey, payload: { question } }));
  const either = itemForToday(games.thisOrThat ?? [], dateKey, (item) => ({ type: "this_or_that", slot: "this_or_that", externalId: `this-or-that-${dateKey}`, title: `${item.left.label} / ${item.right.label}`, editionKey: dailyEditionKey, payload: { left: item.left.label, right: item.right.label } }));
  if (drop) drop.payload = { ...drop.payload, reactionTargetId: `daily-drop-${dateKey}` };
  if (poll) poll.payload = { ...poll.payload, id: `pulse-${dateKey}` };
  let automation = { status: "fallback" };
  let trendPack;
  try {
    if (!budget.checkpoint("trend-collection")) return { dryRun, dateKey, publishAt, expireAt, automation: { status: "budget-exhausted" }, items: [] };
    dailyLog("generation_started", { dateKey, candidate: "daily_interactive" });
    trendPack = await collectDailyTrendPack();
    if (!budget.checkpoint("daily-ai-generation")) return { dryRun, dateKey, publishAt, expireAt, automation: { status: "budget-exhausted" }, items: [] };
    const generated = await generateDailyEdition({ date: now, trends: trendPack, previousQuestions: await previousDailyQuestions() });
    automation = { status: generated.status, theme: generated.theme, trends: trendPack.trends.length, providers: trendPack.providers, trendPack, errors: generated.errors };
    dailyLog("generation_completed", {
      dateKey,
      status: generated.status,
      researchStatus: trendPack.trends.length ? "available" : "empty",
      trendCount: trendPack.trends.length,
      validationErrors: generated.errors ?? [],
    });
    if (generated.status === "success") {
      const content = generated.candidate;
      poll.payload = { id: `pulse-${dateKey}`, question: content.pulse.question, options: content.pulse.options, active: true };
      poll.title = content.pulse.question;
      trivia.payload = content.trivia;
      trivia.title = content.trivia.question;
      chat.payload = { question: content.groupChat.question };
      chat.title = content.groupChat.question;
      // This or That is intentionally curated manually from games.json.
      // AI may generate a candidate, but it must never replace the approved
      // weekly question pool or mix an automated pair with old follow-ups.
      drop.payload = { ...drop.payload, question: content.dailyDropQuestion };
      drop.payload = { ...drop.payload, realQuestion: content.realQuestion };
    }
  } catch (error) {
    trendPack = trendPack ?? { generatedAt: new Date().toISOString(), trends: [], providers: {} };
    automation = { status: "fallback", trendPack, errors: [error instanceof Error ? error.message : "trend or AI service failed"] };
    dailyLog("generation_failed", { dateKey, error: error instanceof Error ? error.message : "trend or AI service failed" });
  }
  const items = [drop, poll, trivia, chat, either].filter(Boolean).map((item) => ({ ...item, status: "scheduled", displayOrder: 1, publishAt, expireAt }));
  dailyLog("candidate_prepared", {
    dateKey,
    candidateSlots: items.map((item) => item.slot),
    requiredSlots: ["daily_drop", "pulse", "daily_trivia", "group_chat_question", "this_or_that"],
    contentOrigin: automation.status === "success" ? "editorial" : "fallback",
    hasRealQuestion: Boolean(drop?.payload?.realQuestion),
  });
  if (automation.status !== "success" && drop) drop.payload = { ...drop.payload, contentOrigin: "fallback" };
  else if (drop) drop.payload = { ...drop.payload, contentOrigin: "editorial" };
  if (dryRun) return { dryRun, dateKey, publishAt, expireAt, automation, items };
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required for daily write mode");
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const editions = process.env.APPWRITE_EDITORIAL_EDITIONS_COLLECTION_ID ?? "editorial_editions";
  const [weeklyMusicRows, dailyMusicRows] = await Promise.all([
    db.listDocuments(database, collection, [Query.equal("slot", "on_repeat_music"), Query.limit(50)]).catch(() => ({ documents: [] })),
    db.listDocuments(database, collection, [Query.equal("slot", "daily_song_pick"), Query.limit(100)]).catch(() => ({ documents: [] })),
  ]);
  const musicRowsForPick = [...weeklyMusicRows.documents, ...dailyMusicRows.documents];
  const candidateSongPick = await discoverySongPick(musicRowsForPick, dateKey, budget) ?? dailySongPick(musicRowsForPick, dateKey);
  if (!budget.checkpoint("music-selection")) return { dryRun, dateKey, publishAt, expireAt, automation: { status: "budget-exhausted" }, items };
  const songPick = await isPlayableSong(candidateSongPick) ? candidateSongPick : null;
  if (songPick) {
    const musicData = { type: "music", slot: "daily_song_pick", externalId: `daily-song-${dateKey}`, title: songPick.track, subtitle: songPick.artist, description: "Today's song pick.", imageUrl: songPick.artwork ?? "", destinationUrl: songPick.url, editionKey: `daily-song-${dateKey}`, displayOrder: 1, status: "scheduled", publishAt, expireAt, payload: JSON.stringify(songPick) };
    const existingMusic = await db.listDocuments(database, collection, [Query.equal("slot", "daily_song_pick"), Query.equal("editionKey", `daily-song-${dateKey}`), Query.limit(1)]);
    if (existingMusic.documents[0]) await db.updateDocument(database, collection, existingMusic.documents[0].$id, musicData); else await db.createDocument(database, collection, ID.unique(), musicData);
  }
  if (songPick && drop) {
    drop.payload = { ...drop.payload, recommendationType: "song", recommendationTitle: `${songPick.track} — ${songPick.artist}`, recommendationHref: songPick.url, recommendationDescription: "A daily under-the-radar pick from the Asian music market." };
  }
  const editionKey = dailyEditionKey;
  const existingManifest = await db.listDocuments(database, editions, [Query.equal("editionKey", editionKey), Query.limit(1)]);
  const idempotent = existingManifest.documents[0]?.status === "committed";
  dailyLog("publication_started", { dateKey, editionKey, idempotent, candidateSlots: items.map((item) => item.slot) });
  let pendingIds = [];
  if (!idempotent && budget.checkpoint("daily-appwrite-writes")) {
    for (const item of items) {
      const existing = await db.listDocuments(database, collection, [Query.equal("slot", item.slot), Query.equal("editionKey", item.editionKey), Query.limit(1)]);
      const data = { ...item, status: "approved", payload: JSON.stringify(item.payload) };
      if (existing.documents[0]) { await db.updateDocument(database, collection, existing.documents[0].$id, data); pendingIds.push(existing.documents[0].$id); }
      else { const created = await db.createDocument(database, collection, ID.unique(), data); pendingIds.push(created.$id); }
      dailyLog("item_written", { dateKey, slot: item.slot, documentId: pendingIds.at(-1), writeResult: existing.documents[0] ? "updated" : "created" });
    }
  }
  if (!idempotent && budget.checkpoint("daily-publication-verification")) {
    const verifiedRows = (await Promise.all(items.map((item) =>
      db.listDocuments(database, collection, [
        Query.equal("slot", item.slot),
        Query.equal("editionKey", editionKey),
        Query.limit(100),
      ]),
    ))).flatMap((result) => result.documents);
    // Appwrite normalizes DateTime attributes to UTC ISO strings. Compare the
    // instant in time, not the original +08:00 representation we wrote.
    const expectedPublishMs = new Date(publishAt).getTime();
    const publishTimesMatch = Number.isFinite(expectedPublishMs) && verifiedRows.every((row) => {
      const actualPublishMs = new Date(row.publishAt ?? "").getTime();
      return Number.isFinite(actualPublishMs) && actualPublishMs === expectedPublishMs;
    });
    const diagnostics = validateDailyEdition(verifiedRows, editionKey);
    const validation = { ...diagnostics, publishTimesMatch };
    dailyLog("publication_verified", { dateKey, ...validation });
    if (!diagnostics.valid || !publishTimesMatch) {
      dailyLog("publication_validation_failed", { dateKey, ...validation });
      throw new Error(`Daily edition validation failed: ${JSON.stringify(validation)}`);
    }
    const manifest = { editionKey, editionType: "daily_interactive", status: "committed", publishDate: dateKey, publishAt, committedAt: new Date().toISOString(), expectedItemCount: 5, itemIds: JSON.stringify(pendingIds) };
    if (existingManifest.documents[0]) await db.updateDocument(database, editions, existingManifest.documents[0].$id, manifest);
    else await db.createDocument(database, editions, ID.unique(), manifest);
    for (const id of pendingIds) await db.updateDocument(database, collection, id, { status: "scheduled" });
    dailyLog("manifest_committed", { dateKey, editionKey, itemCount: pendingIds.length, status: "committed" });
    await invalidatePublishedEditorialCaches(dateKey);
  }
  const result = { dryRun, dateKey, publishAt, expireAt, automation, songPick: songPick ? `${songPick.track} — ${songPick.artist}` : null, published: items.map((item) => item.slot), idempotent };
  dailyLog("run_completed", { dateKey, published: result.published, idempotent });
  return result;
}

export async function runEditorialDailyMaintenance({ now = new Date() } = {}) {
  const [{ runDailyHomepageCuration }, { runDailyCleanup }] = await Promise.all([
    import("./editorial-daily/curation-runner.mjs"),
    import("./editorial-daily/cleanup-runner.mjs"),
  ]);
  const budget = createExecutionBudget({ onExhausted: (details) => dailyLog("budget_exhausted", details) });
  const dateKey = malaysiaDate(now);
  const startedAt = Date.now();
  dailyLog("maintenance_phase_started", { dateKey, phase: "curation" });
  const curation = budget.checkpoint("maintenance-curation") ? await runDailyHomepageCuration(now).catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "curation failed" })) : { status: "budget-exhausted" };
  dailyLog("maintenance_phase_finished", { dateKey, phase: "curation", elapsedMs: Date.now() - startedAt, status: curation?.status ?? "unknown" });
  const cleanupStartedAt = Date.now();
  dailyLog("maintenance_phase_started", { dateKey, phase: "cleanup" });
  const cleanup = budget.checkpoint("maintenance-cleanup") ? await runDailyCleanup({ maxPagesPerCollection: 2, maxItemsPerRun: 200, budget }).catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "cleanup failed" })) : { status: "budget-exhausted" };
  const cleanupRecord = cleanup && typeof cleanup === "object" ? cleanup : {};
  dailyLog("maintenance_phase_finished", { dateKey, phase: "cleanup", elapsedMs: Date.now() - cleanupStartedAt, status: cleanupRecord.status ?? "unknown", scanned: cleanupRecord.scanned ?? 0, deleted: cleanupRecord.deleted ?? 0, bounded: cleanupRecord.bounded ?? false });
  const result = { dateKey, curation, cleanup };
  dailyLog("maintenance_completed", { dateKey, elapsedMs: Date.now() - startedAt, curationStatus: curation?.status ?? "unknown", cleanupStatus: cleanup?.status ?? "unknown" });
  return result;
}
