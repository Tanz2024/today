import "server-only";

import { Query } from "node-appwrite";
import { unstable_cache } from "next/cache";
import dailyDrops from "@/content/daily-drops.json";
import horoscopes from "@/content/horoscopes.json";
import metroPicks from "@/content/metro-picks.json";
import music from "@/content/music.json";
import onScreen from "@/content/on-screen.json";
import polls from "@/content/polls.json"; 
import games from "@/content/games.json";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";
import { EDITORIAL_COLLECTION_ID, isValidTypeSlot, validateEditorialPayload } from "@/lib/editorial-content-config";
import type { EditorialContent, EditorialSlot, EditorialType } from "@/types/editorial-content";
import { DAILY_INTERACTIVE_SLOTS, dailyEditionContentQueries, getCommittedDailyManifest, isCompleteDailyEdition, isDailyInteractiveSlot } from "@/lib/editorial-editions";
import { isAppwriteDatabaseUnavailable, warnAppwriteQuotaUnavailable } from "@/lib/appwrite-errors";

type DocumentLike = Record<string, unknown> & { $id?: string; $createdAt?: string; $updatedAt?: string };
type LegacyGames = { thisOrThat?: Array<Record<string, unknown>>; groupChat?: Record<string, string[]>; wouldYouRather?: Array<Record<string, unknown>> };
const gameCatalog = games as unknown as LegacyGames;

function documentToContent(document: DocumentLike): EditorialContent {
  const rawPayload = document.payload;
  const payload = typeof rawPayload === "string" ? (() => { try { return JSON.parse(rawPayload) as Record<string, unknown>; } catch { return undefined; } })() : rawPayload as Record<string, unknown> | undefined;
  return {
    ...(document as unknown as EditorialContent),
    id: document.id ? String(document.id) : document.$id,
    createdAt: document.createdAt ? String(document.createdAt) : document.$createdAt,
    updatedAt: document.updatedAt ? String(document.updatedAt) : document.$updatedAt,
    payload,
  };
}

function isActive(item: EditorialContent, now: Date) {
  if (item.status !== "scheduled" && item.status !== "published") return false;
  if (!item.publishAt || new Date(item.publishAt).getTime() > now.getTime()) return false;
  return !item.expireAt || new Date(item.expireAt).getTime() > now.getTime();
}

function sortByPublication(a: EditorialContent, b: EditorialContent) {
  return new Date(b.publishAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.publishAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
}

async function listSlot(slot: EditorialSlot, editionKey?: string): Promise<EditorialContent[]> {
  const databases = getDatabases();
  if (!databases) return [];
  try {
    const result = await databases.listDocuments(APPWRITE_DATABASE_ID, EDITORIAL_COLLECTION_ID,
      editionKey ? dailyEditionContentQueries(slot, editionKey) : [Query.equal("slot", slot), Query.limit(100), Query.orderDesc("publishAt")]);
    return result.documents.map((document) => documentToContent(document as unknown as DocumentLike));
  } catch (error) {
    if (!isAppwriteDatabaseUnavailable(error)) throw error;
    warnAppwriteQuotaUnavailable(`editorial slot ${slot}`);
    return [];
  }
}

async function listPublicSlot(slot: EditorialSlot, now: Date) {
  if (!isDailyInteractiveSlot(slot)) return cachedListSlot(slot);
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now);
  const manifest = await getCommittedDailyManifest(dateKey);
  // Prefer the committed manifest for atomic daily publication. If the
  // manifest cache or collection is temporarily unavailable, keep the site
  // current by returning scheduled items; getCurrentSlot() still applies the
  // publish/expiry window before rendering anything.
  if (!manifest || manifest.expectedItemCount !== 5) {
    console.warn(`[editorial-content] daily manifest unavailable for ${slot}; using active scheduled-item fallback`);
    return cachedListSlot(slot);
  }
  const editionItems = await cachedListCommittedEdition(manifest.editionKey);
  if (isCompleteDailyEdition(editionItems, manifest.editionKey)) {
    return editionItems.filter((item) => item.slot === slot);
  }
  console.warn(`[editorial-content] incomplete daily edition for ${slot}; using active scheduled-item fallback`);
  return cachedListSlot(slot);
}

// Public editorial data is shared by anonymous homepage visitors. Cache the
// Appwrite read itself rather than relying on fetch caching, because the
// Appwrite SDK uses its own network client. Five minutes is long enough to
// avoid a request per visitor while keeping scheduled content reasonably
// fresh.
const cachedSlotReaders = new Map<string, () => Promise<EditorialContent[]>>();
const cachedEditionReaders = new Map<string, () => Promise<EditorialContent[]>>();

function cachedListSlot(slot: EditorialSlot, editionKey?: string): Promise<EditorialContent[]> {
  const cacheKey = `${slot}:${editionKey ?? "active"}`;
  let reader = cachedSlotReaders.get(cacheKey);
  if (!reader) {
    reader = unstable_cache(
      () => listSlot(slot, editionKey),
      ["editorial-content-slot", slot, editionKey ?? "active"],
      { revalidate: 3600, tags: ["homepage-editorial", "weekly-editorial", `editorial-slot-${slot}`] },
    );
    cachedSlotReaders.set(cacheKey, reader);
  }
  return reader();
}

function cachedListCommittedEdition(editionKey: string): Promise<EditorialContent[]> {
  let reader = cachedEditionReaders.get(editionKey);
  if (!reader) {
    reader = unstable_cache(
      () => Promise.all(DAILY_INTERACTIVE_SLOTS.map((slot) => listSlot(slot, editionKey))).then((groups) => groups.flat()),
      ["editorial-content-daily-edition", editionKey],
      { revalidate: 3600, tags: ["homepage-editorial", "daily-interactive"] },
    );
    cachedEditionReaders.set(editionKey, reader);
  }
  return reader();
}

export async function getCurrentSlot(slot: EditorialSlot, now = new Date()): Promise<EditorialContent | null> {
  const items = await listPublicSlot(slot, now);
  const active = items.filter((item) => isActive(item, now)).sort(sortByPublication);
  if (active.length > 1) console.warn(`[editorial-content] multiple active items for ${slot}; using the most recently published item`);
  return active[0] ?? items.filter((item) => (item.status === "scheduled" || item.status === "published") && item.publishAt && new Date(item.publishAt).getTime() <= now.getTime()).sort(sortByPublication)[0] ?? null;
}

function currentEdition(items: EditorialContent[], now: Date) {
  const active = items.filter((item) => isActive(item, now));
  const editions = new Map<string, EditorialContent[]>();
  for (const item of active) {
    const key = item.editionKey ?? item.publishAt ?? item.id ?? item.externalId ?? "legacy";
    editions.set(key, [...(editions.get(key) ?? []), item]);
  }
  return [...editions.values()].sort((a, b) => sortByPublication(a[0], b[0]))[0] ?? [];
}

export async function getCurrentSlotItems(slot: EditorialSlot, now = new Date()) {
  return currentEdition(await listPublicSlot(slot, now), now).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export async function getCurrentEdition(slot: EditorialSlot, now = new Date()) {
  const items = await getCurrentSlotItems(slot, now);
  return items[0]?.editionKey ?? items[0]?.publishAt ?? null;
}

export async function getCurrentEditionItems(slot: EditorialSlot, now = new Date()) {
  return getCurrentSlotItems(slot, now);
}

export async function getLatestEdition(slot: EditorialSlot, now = new Date()) {
  const items = await cachedListSlot(slot);
  const eligible = items.filter((item) => (item.status === "scheduled" || item.status === "published") && item.publishAt && new Date(item.publishAt).getTime() <= now.getTime());
  return currentEdition(eligible, now).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export async function getLatestPublishedSlot(slot: EditorialSlot, now = new Date()) {
  const items = await listPublicSlot(slot, now);
  return items.filter((item) => (item.status === "scheduled" || item.status === "published") && item.publishAt && new Date(item.publishAt).getTime() <= now.getTime()).sort(sortByPublication)[0] ?? null;
}

export async function getScheduledSlot(slot: EditorialSlot) {
  const items = await cachedListSlot(slot);
  return items.filter((item) => item.status === "scheduled").sort((a, b) => new Date(a.publishAt ?? 0).getTime() - new Date(b.publishAt ?? 0).getTime())[0] ?? null;
}

export async function getEditorialCandidates(type: EditorialType) {
  const databases = getDatabases();
  if (!databases) return [];
  try {
    const result = await databases.listDocuments(APPWRITE_DATABASE_ID, EDITORIAL_COLLECTION_ID, [Query.equal("type", type), Query.equal("status", "candidate"), Query.limit(100), Query.orderDesc("brisaScore")]);
    return result.documents.map((document) => documentToContent(document as unknown as DocumentLike));
  } catch (error) {
    console.warn(`[editorial-content] failed to read candidates for ${type}`, error instanceof Error ? error.message : "unknown error");
    return [];
  }
}

function fallback(type: EditorialType, slot: EditorialSlot): EditorialContent[] {
  const now = new Date().toISOString();
  if (type === "music") return (music as Array<Record<string, unknown>>).map((item, index) => ({ type, slot, title: String(item.track ?? ""), subtitle: String(item.artist ?? ""), imageUrl: String(item.artwork ?? ""), destinationUrl: String(item.spotifyUrl ?? ""), externalId: String(item.id ?? index), status: "published", editionKey: item.week ? `music-${item.week}` : undefined, displayOrder: index + 1, publishAt: String(item.week ?? now), payload: item }));
  if (type === "poll") return (polls as Array<Record<string, unknown>>).map((item) => ({ type, slot, title: String(item.question ?? ""), externalId: String(item.id ?? ""), status: "published", payload: item }));
  if (type === "daily_drop") return (dailyDrops as Array<Record<string, unknown>>).map((item) => ({ type, slot, title: String(item.storyTitle ?? ""), externalId: String(item.id ?? ""), status: "published", publishAt: `${item.date}T00:00:00+08:00`, payload: item }));
  if (type === "horoscope") return [{ type, slot, title: "Weekly horoscope", status: "published", payload: horoscopes as unknown as Record<string, unknown> }];
  if (type === "metro_pick") return (metroPicks as Array<Record<string, unknown>>).map((item) => ({ type, slot, title: String(item.title ?? ""), externalId: String(item.id ?? ""), status: "published", payload: item }));
  if (type === "this_or_that") return (gameCatalog.thisOrThat ?? []).map((item, index) => ({ type, slot, title: `This or That ${index + 1}`, externalId: String(item.id ?? index), status: "published", payload: { left: (item.left as Record<string, unknown>)?.label, right: (item.right as Record<string, unknown>)?.label } }));
  if (type === "group_chat_question") return Object.entries(gameCatalog.groupChat ?? {}).flatMap(([category, questions]) => questions.map((question, index) => ({ type, slot, title: question, externalId: `group-chat-${category.toLowerCase().replaceAll(" ", "-")}-${index + 1}`, status: "published", payload: { question } })));
  if (type === "trivia") return (gameCatalog.wouldYouRather ?? []).map((item, index) => ({ type, slot, title: `Would you rather ${index + 1}`, externalId: String(item.id ?? index), status: "published", payload: { question: "Would you rather?", options: [item.left, item.right] } }));
  if (type === "movie" || type === "tv" || type === "anime" || type === "game") return (onScreen.items as Array<Record<string, unknown>>).filter((item) => type === "anime" ? item.section === "Anime" : type === "movie" ? item.section === "Movies" : type === "tv" ? item.section === "Trending TV" : false).map((item, index) => ({ type, slot, title: String(item.title ?? ""), externalId: String(item.tmdbId ?? item.title ?? ""), status: "published", editionKey: onScreen.week ? `on-screen-${onScreen.week}` : undefined, displayOrder: Number(item.rank ?? index + 1), publishAt: onScreen.week ? `${onScreen.week}T00:00:00+08:00` : now, payload: item }));
  return [];
}

export async function getCurrentEditorialContent(type: EditorialType, slot: EditorialSlot, now = new Date()) {
  const current = await getCurrentSlot(slot, now);
  if (current) return current;
  const previous = await getLatestPublishedSlot(slot, now);
  if (previous) return previous;
  return fallback(type, slot).filter((item) => new Date(item.publishAt ?? now).getTime() <= now.getTime()).sort(sortByPublication)[0] ?? null;
}

export async function getCurrentEditorialItems(type: EditorialType, slot: EditorialSlot, now = new Date()) {
  const current = await getCurrentSlotItems(slot, now);
  if (current.length) return current;
  const fallbackItems = fallback(type, slot).filter((item) => !item.publishAt || new Date(item.publishAt).getTime() <= now.getTime());
  return fallbackItems.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export const getCurrentMusic = (now?: Date) => getCurrentEditorialContent("music", "on_repeat_music", now);
export const getCurrentMusicItems = (now?: Date) => getCurrentEditorialItems("music", "on_repeat_music", now);
export const getCurrentDailySong = (now?: Date) => getCurrentEditorialContent("music", "daily_song_pick", now);
export const getCurrentMovie = (now?: Date) => getCurrentEditorialContent("movie", "on_screen_movie", now);
export const getCurrentMovieItems = (now?: Date) => getCurrentEditorialItems("movie", "on_screen_movie", now);
export const getCurrentTV = (now?: Date) => getCurrentEditorialContent("tv", "on_screen_tv", now);
export const getCurrentTVItems = (now?: Date) => getCurrentEditorialItems("tv", "on_screen_tv", now);
export const getCurrentAnime = (now?: Date) => getCurrentEditorialContent("anime", "on_screen_anime", now);
export const getCurrentAnimeItems = (now?: Date) => getCurrentEditorialItems("anime", "on_screen_anime", now);
export const getCurrentGame = (now?: Date) => getCurrentEditorialContent("game", "on_screen_game", now);
export const getCurrentDailyDrop = (now?: Date) => getCurrentEditorialContent("daily_drop", "daily_drop", now);
export const getCurrentPoll = (now?: Date) => getCurrentEditorialContent("poll", "pulse", now);
export const getCurrentHoroscope = (now?: Date) => getCurrentEditorialContent("horoscope", "horoscope_week", now);
export const getCurrentMetroPicks = (now?: Date) => getCurrentEditorialContent("metro_pick", "metro_pick", now);
export const getCurrentTrivia = (now?: Date) => getCurrentEditorialContent("trivia", "daily_trivia", now);
export const getCurrentGroupChatQuestion = (now?: Date) => getCurrentEditorialContent("group_chat_question", "group_chat_question", now);
export const getCurrentWeeklyQuestion = (now?: Date) => getCurrentEditorialContent("weekly_question", "weekly_question", now);

export function isActiveEditorialContent(item: EditorialContent, now = new Date()) {
  return isActive(item, now);
}

export function validateEditorialContent(item: Partial<EditorialContent>): string[] {
  const errors: string[] = [];
  if (!item.type) errors.push("type is required");
  if (!item.slot) errors.push("slot is required");
  if (!item.status) errors.push("status is required");
  if (item.type && item.slot && !isValidTypeSlot(item.type, item.slot)) errors.push(`type ${item.type} cannot use slot ${item.slot}`);
  if (!item.title?.trim()) errors.push("title is required");
  if (item.publishAt && Number.isNaN(new Date(item.publishAt).getTime())) errors.push("publishAt must be a valid date");
  if (item.expireAt && Number.isNaN(new Date(item.expireAt).getTime())) errors.push("expireAt must be a valid date");
  if (item.publishAt && item.expireAt && new Date(item.publishAt).getTime() >= new Date(item.expireAt).getTime()) errors.push("publishAt must be before expireAt");
  if (item.destinationUrl) { try { new URL(item.destinationUrl); } catch { errors.push("destinationUrl must be a valid URL"); } }
  errors.push(...(item.type ? validateEditorialPayload(item.type, item.payload) : []));
  return errors;
}
