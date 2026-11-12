// Weekly Food & Drink + Travel & City Life long-form pipeline.
//
// This reuses the canonical generated-article system in
// editorial-article-ai.mjs (createArticleDraft) for writing, image
// resolution and Appwrite storage. This file only adds what that system
// doesn't have: venue identity (Foursquare), current-trend discovery
// (Tavily/TheNewsAPI/YouTube/Ticketmaster), and the official-source
// verification rules for venues, promotions and events described in the
// editorial brief.
//
// AUTO-PUBLISH IS INTENTIONALLY HARD-CODED OFF in runWeeklyFoodTravel: every
// candidate that clears verification is still handed to createArticleDraft
// with autoPublish: false, so results land as "candidate" drafts for the
// moderator review desk, never published automatically.

import { createExecutionBudget } from "./execution-budget.mjs";
import { cronFetch } from "./cron-fetch.mjs";

export const FOOD_TRAVEL_CATEGORIES = ["food", "travel"];
const EXTERNAL_REQUEST_CONCURRENCY = 4;

// Aggregator/coupon sites are frequently wrong or expired and must never be
// treated as the "official" confirmation for a promotion or venue.
const VOUCHER_AGGREGATOR_DOMAINS = [
  "groupon.com", "retailmenot.com", "coupons.com", "honey.com", "picodi.com",
  "vouchercodes.com", "rakuten.com", "deals.com", "promocodes.com", "cuponation.com",
  "shopback.com", "fave.co",
];

// Explicitly recognised official tourism/municipal sources. This is not the
// blacklist's mirror image — it is a short allowlist of domains we already
// know are authoritative, kept deliberately small on purpose (fail closed:
// anything not on it must prove itself another way, e.g. matching a venue's
// own officialWebsite).
const KNOWN_OFFICIAL_DOMAINS = [
  "malaysia.travel", "tourism.gov.my", "visitkl.gov.my", "dbkl.gov.my",
  "amazingthailand.com", "tourismthailand.org", "visitsingapore.com", "stb.gov.sg",
  "vietnam.travel", "tourism.gov.ph",
];

const TICKETMASTER_HOSTS = ["ticketmaster.com", "ticketmaster.com.my", "ticketmaster.sg"];

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

async function mapWithConcurrency(items, worker, limit = EXTERNAL_REQUEST_CONCURRENCY, budget) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      if (budget && !budget.checkpoint("food-travel-venue-verification", { index })) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

function hostOf(url) {
  try { return new URL(String(url)).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Venue identity (Foursquare) + normalization
// ---------------------------------------------------------------------------

export function normalizeVenue(raw = {}) {
  return {
    venueName: String(raw.venueName ?? raw.name ?? "").trim(),
    venueType: String(raw.venueType ?? raw.category ?? "").trim(),
    address: String(raw.address ?? raw.location?.formatted_address ?? "").trim(),
    latitude: raw.latitude ?? raw.location?.lat ?? raw.geocodes?.main?.latitude ?? null,
    longitude: raw.longitude ?? raw.location?.lng ?? raw.geocodes?.main?.longitude ?? null,
    officialWebsite: raw.officialWebsite ?? null,
    officialSocialUrl: raw.officialSocialUrl ?? null,
    openingHours: raw.openingHours ?? null,
    verifiedAt: raw.verifiedAt ?? "",
    locationProvider: "foursquare",
    officialSourceUrl: raw.officialSourceUrl ?? "",
    foursquareId: raw.foursquareId ?? raw.fsq_id ?? null,
    permanentlyClosed: Boolean(raw.permanentlyClosed),
  };
}

export function venueKey(venue) {
  return venue.foursquareId ? `fsq:${venue.foursquareId}` : `${normalize(venue.venueName)}|${normalize(venue.address)}`;
}

export function dedupeVenues(venues = []) {
  const seen = new Set();
  const out = [];
  for (const raw of venues) {
    const venue = normalizeVenue(raw);
    const key = venueKey(venue);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(venue);
  }
  return out;
}

// A venue Foursquare returns as closed must never be recommended, even if it
// otherwise looked like a strong candidate.
export function rejectClosedVenues(venues = []) {
  return venues.filter((venue) => !venue.permanentlyClosed);
}

function matchesHost(host, candidate) {
  const candidateHost = hostOf(candidate) ?? String(candidate ?? "").replace(/^www\./, "").toLowerCase();
  if (!candidateHost) return false;
  return host === candidateHost || host.endsWith(`.${candidateHost}`);
}

// Fails closed: a URL is official ONLY when at least one concrete rule
// passes. Not being on the aggregator blacklist is never, by itself,
// evidence of anything — it just rules out the worst offenders before the
// real checks run.
/** @param {*} url @param {{trustedHosts?: string[], allowTicketmaster?: boolean}} [options] */
export function evaluateOfficialSource(url, { trustedHosts = [], allowTicketmaster = false } = {}) {
  const host = hostOf(url);
  if (!host) return { officialVerified: false, reason: "missing or invalid source URL" };
  if (VOUCHER_AGGREGATOR_DOMAINS.some((domain) => matchesHost(host, domain))) {
    return { officialVerified: false, reason: "known coupon/aggregator domain, not an official source" };
  }
  const trustedMatch = trustedHosts.filter(Boolean).some((trusted) => matchesHost(host, trusted));
  if (trustedMatch) return { officialVerified: true, reason: "matches the venue/organiser's verified official domain" };
  if (allowTicketmaster && TICKETMASTER_HOSTS.some((trusted) => matchesHost(host, trusted))) {
    return { officialVerified: true, reason: "Ticketmaster is the authoritative ticketing listing for this event" };
  }
  if (KNOWN_OFFICIAL_DOMAINS.some((trusted) => matchesHost(host, trusted))) {
    return { officialVerified: true, reason: "recognised official tourism/municipal source" };
  }
  return { officialVerified: false, reason: "official identity could not be established for this domain" };
}

// Backwards-compatible boolean wrapper. Note this now fails closed: an
// unknown, non-blacklisted domain returns false, not true.
export function isOfficialSourceUrl(url, trustedHosts = []) {
  return evaluateOfficialSource(url, { trustedHosts }).officialVerified;
}

// Foursquare gives us *identity* (name/address/coordinates). It is not, by
// itself, proof a venue is currently open, promoting something, or worth
// recommending — verifyVenue requires a separate official source before the
// venue can be marked verified/current.
/** @param {*} venue @param {{officialSourceUrl?: string, verifiedAt?: string}} [options] */
export function verifyVenue(venue, { officialSourceUrl, verifiedAt = new Date().toISOString() } = {}) {
  const normalized = normalizeVenue(venue);
  if (!normalized.venueName || !normalized.address) return { ...normalized, verified: false, officialVerified: false, reason: "missing venue identity" };
  if (normalized.permanentlyClosed) return { ...normalized, verified: false, officialVerified: false, reason: "venue is closed" };
  if (!officialSourceUrl) return { ...normalized, verified: false, officialVerified: false, reason: "no official source confirming current details" };
  const trusted = [normalized.officialWebsite, normalized.officialSocialUrl].filter(Boolean);
  const evaluation = evaluateOfficialSource(officialSourceUrl, { trustedHosts: trusted });
  if (!evaluation.officialVerified) return { ...normalized, verified: false, officialVerified: false, reason: evaluation.reason };
  return { ...normalized, officialSourceUrl, verifiedAt, verified: true, officialVerified: true, reason: evaluation.reason };
}

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export function normalizePromotion(raw = {}) {
  return {
    promotionTitle: String(raw.promotionTitle ?? "").trim(),
    promotionStart: raw.promotionStart ?? null,
    promotionEnd: raw.promotionEnd ?? null,
    promotionTerms: raw.promotionTerms ?? null,
    participatingLocations: Array.isArray(raw.participatingLocations) ? raw.participatingLocations : [],
    promotionSourceUrl: String(raw.promotionSourceUrl ?? "").trim(),
    promotionVerifiedAt: raw.promotionVerifiedAt ?? "",
  };
}

/** @param {*} rawPromotion @param {Date} [now] @param {{trustedHosts?: string[]}} [options] */
export function isPromotionCurrent(rawPromotion, now = new Date(), { trustedHosts = [] } = {}) {
  const promotion = normalizePromotion(rawPromotion);
  if (!promotion.promotionTitle) return { current: false, officialVerified: false, reason: "missing promotion title" };
  const evaluation = evaluateOfficialSource(promotion.promotionSourceUrl, { trustedHosts });
  if (!evaluation.officialVerified) return { current: false, officialVerified: false, reason: "promotion is not confirmed by an official source" };
  if (!promotion.promotionEnd) return { current: false, officialVerified: true, reason: "promotion validity/expiry could not be confirmed" };
  const end = new Date(promotion.promotionEnd);
  if (Number.isNaN(end.getTime()) || end.getTime() < now.getTime()) return { current: false, officialVerified: true, reason: "promotion has expired" };
  return { current: true, officialVerified: true, reason: "confirmed by official source and not yet expired" };
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function normalizeEvent(raw = {}) {
  return {
    eventName: String(raw.eventName ?? raw.name ?? "").trim(),
    eventDate: raw.eventDate ?? raw.dates?.start?.dateTime ?? null,
    venueName: String(raw.venueName ?? raw._embedded?.venues?.[0]?.name ?? "").trim(),
    address: String(raw.address ?? "").trim(),
    ticketUrl: raw.ticketUrl ?? raw.url ?? null,
    officialSourceUrl: raw.officialSourceUrl ?? raw.ticketUrl ?? raw.url ?? "",
    source: raw.source ?? (hostOf(raw.url) && TICKETMASTER_HOSTS.some((host) => matchesHost(hostOf(raw.url), host)) ? "ticketmaster" : "tavily"),
    verifiedAt: raw.verifiedAt ?? "",
  };
}

/** @param {*} rawEvent @param {Date} [now] @param {{trustedHosts?: string[]}} [options] */
export function isEventCurrent(rawEvent, now = new Date(), { trustedHosts = [] } = {}) {
  const event = normalizeEvent(rawEvent);
  if (!event.eventName || !event.eventDate) return { current: false, officialVerified: false, reason: "missing event name or date" };
  const date = new Date(event.eventDate);
  if (Number.isNaN(date.getTime()) || date.getTime() < now.getTime()) return { current: false, officialVerified: false, reason: "event has already happened" };
  const evaluation = evaluateOfficialSource(event.officialSourceUrl, { trustedHosts, allowTicketmaster: event.source === "ticketmaster" });
  if (!evaluation.officialVerified) return { current: false, officialVerified: false, reason: "event is not confirmed by an official organiser/venue/ticketing source" };
  return { current: true, officialVerified: true, reason: evaluation.reason };
}

// ---------------------------------------------------------------------------
// Image policy
// ---------------------------------------------------------------------------

// A story about one named venue/product needs a real photo of that exact
// place. A general roundup/guide can use editorial (e.g. Pexels) imagery.
// Mirrors the {image,...,needsImageReview} shape resolveImage() already
// produces in editorial-article-ai.mjs so both flow through the same
// validation/storage path.
/** @param {{requiresExactImage?: boolean, exactImageUrl?: *, exactImageSourceType?: string, editorialImage?: *}} [options] */
export function resolveVenueImageDecision({ requiresExactImage, exactImageUrl, exactImageSourceType, editorialImage } = {}) {
  if (!requiresExactImage) {
    if (editorialImage) return { ...editorialImage, requiresExactImage: false, isExactImage: false, needsImageReview: false };
    return { image: "", requiresExactImage: false, isExactImage: false, needsImageReview: true };
  }
  const allowedExactSources = ["official-venue", "official-event", "licensed"];
  if (exactImageUrl && allowedExactSources.includes(exactImageSourceType)) {
    return { image: exactImageUrl, imageSourceType: exactImageSourceType, requiresExactImage: true, isExactImage: true, needsImageReview: false };
  }
  return { image: exactImageUrl ?? "", imageSourceType: exactImageSourceType ?? "unresolved", requiresExactImage: true, isExactImage: false, needsImageReview: true };
}

// ---------------------------------------------------------------------------
// Candidate selection — quality over quota
// ---------------------------------------------------------------------------

// Scores how strong a weekly candidate topic is. Never fabricate a score to
// force a weak topic through: 0 verified venues/events/promotions and no
// current-buzz signal means the week produces no article for that beat.
/** @param {{verifiedVenues?: *[], verifiedEvents?: *[], currentPromotions?: *[], buzzSignals?: number}} [options] */
export function scoreCandidateTopic({ verifiedVenues = [], verifiedEvents = [], currentPromotions = [], buzzSignals = 0 } = {}) {
  const venueScore = Math.min(verifiedVenues.length, 5) * 0.15;
  const eventScore = Math.min(verifiedEvents.length, 3) * 0.15;
  const promoScore = Math.min(currentPromotions.length, 3) * 0.1;
  const buzzScore = Math.min(buzzSignals, 4) * 0.05;
  const hasAnyEditorialReason = verifiedVenues.length + verifiedEvents.length + currentPromotions.length > 0;
  const score = hasAnyEditorialReason ? Math.min(1, venueScore + eventScore + promoScore + buzzScore + 0.2) : 0;
  return Number(score.toFixed(3));
}

export function selectWeeklyCandidate(candidates = [], { minScore = 0.35 } = {}) {
  const scored = candidates
    .map((candidate) => ({ ...candidate, strengthScore: candidate.strengthScore ?? scoreCandidateTopic(candidate) }))
    .filter((candidate) => candidate.strengthScore >= minScore)
    .sort((a, b) => b.strengthScore - a.strengthScore);
  return scored[0] ?? null;
}

// ---------------------------------------------------------------------------
// Malaysia-time weekly schedule
// ---------------------------------------------------------------------------

// Food & Drink generates Wednesday mornings, Travel & City Life generates
// Friday mornings (Asia/Kuala_Lumpur), each independent of the other and of
// the Monday weekly edition (music/on-screen/global picks) and the daily
// runner. Times are generation/research checkpoints, not publish times —
// these stories stay drafts until a human approves them.
export function getWeeklyFoodTravelSchedule(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(values.weekday);
  const anchor = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day));
  const nextWeekday = (target) => { const add = (target - weekdayIndex + 7) % 7; const day = new Date(anchor + add * 86400000); return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 1)); }; // 01:00 UTC = 09:00 MYT
  const food = nextWeekday(3); // Wednesday
  const travel = nextWeekday(5); // Friday
  return {
    food: { dateKey: food.toISOString().slice(0, 10), generateAt: food.toISOString() },
    travel: { dateKey: travel.toISOString().slice(0, 10), generateAt: travel.toISOString() },
    timezone: "Asia/Kuala_Lumpur",
  };
}

// ---------------------------------------------------------------------------
// Discovery (Foursquare / Tavily / TheNewsAPI / YouTube / Ticketmaster)
// ---------------------------------------------------------------------------

async function json(url, options) {
  const response = await cronFetch(url, options, 12_000);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function fetchFoursquareVenues(query, { near = "Kuala Lumpur, Malaysia", limit = 8 } = {}) {
  const key = process.env.FOURSQUARE_API_KEY?.trim();
  if (!key) return [];
  const url = `https://api.foursquare.com/v3/places/search?${new URLSearchParams({ query, near, limit: String(limit) })}`;
  const data = await json(url, { headers: { Authorization: key, accept: "application/json" } });
  return (data.results ?? []).map((place) => normalizeVenue({
    name: place.name,
    category: place.categories?.[0]?.name,
    address: place.location?.formatted_address,
    latitude: place.geocodes?.main?.latitude,
    longitude: place.geocodes?.main?.longitude,
    foursquareId: place.fsq_id,
    permanentlyClosed: place.closed_bucket === "VeryLikelyClosed",
  }));
}

// Foursquare search results don't include a website; the place-details
// endpoint does. This is what lets a venue's officialWebsite be a real,
// provable field instead of a guess.
export async function fetchFoursquarePlaceWebsite(fsqId) {
  const key = process.env.FOURSQUARE_API_KEY?.trim();
  if (!key || !fsqId) return null;
  try {
    const data = await json(`https://api.foursquare.com/v3/places/${encodeURIComponent(fsqId)}?fields=website`, { headers: { Authorization: key, accept: "application/json" } });
    return data.website || null;
  } catch { return null; }
}

export async function fetchTicketmasterEvents({ city = "Kuala Lumpur", keyword = "" } = {}) {
  const key = process.env.TICKETMASTER_API_KEY?.trim();
  if (!key) return [];
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${new URLSearchParams({ apikey: key, city, keyword, sort: "date,asc", size: "10" })}`;
  const data = await json(url);
  return (data._embedded?.events ?? []).map((event) => normalizeEvent({
    name: event.name,
    eventDate: event.dates?.start?.dateTime,
    venueName: event._embedded?.venues?.[0]?.name,
    address: event._embedded?.venues?.[0]?.address?.line1,
    url: event.url,
    source: "ticketmaster",
  }));
}

export async function fetchYoutubeBuzzCount(query) {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return 0;
  const url = `https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({ key, q: query, part: "snippet", type: "video", order: "viewCount", publishedAfter: new Date(Date.now() - 30 * 86400000).toISOString(), maxResults: "10" })}`;
  const data = await json(url);
  return Array.isArray(data.items) ? data.items.length : 0;
}

async function discoverCurrentSignals(query) {
  const signals = [];
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const newsKey = process.env.THE_NEWS_API_TOKEN?.trim();
  if (tavilyKey) {
    const data = await json("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: tavilyKey, query, topic: "news", time_range: "week", max_results: 5, include_answer: false }) });
    for (const result of data.results ?? []) signals.push({ title: result.title, summary: result.content, url: result.url, source: "tavily", publishedAt: result.published_date ?? null });
  }
  if (newsKey) {
    const data = await json(`https://api.thenewsapi.com/v1/news/all?api_token=${encodeURIComponent(newsKey)}&search=${encodeURIComponent(query)}&language=en&limit=5`, { headers: { accept: "application/json" } });
    for (const result of data.data ?? []) signals.push({ title: result.title, summary: result.description, url: result.url, source: "the-news-api", publishedAt: result.published_at ?? null });
  }
  return signals;
}

export async function discoverFoodCandidateSignals(city = "Kuala Lumpur") {
  return discoverCurrentSignals(`new restaurant OR cafe opening OR viral food OR dessert trend ${city} this week`);
}

export async function discoverTravelCandidateSignals(city = "Kuala Lumpur") {
  return discoverCurrentSignals(`weekend guide OR pop-up OR neighbourhood OR things to do ${city} Asia this week`);
}

// ---------------------------------------------------------------------------
// Orchestration — glues discovery + verification into a candidate that the
// canonical writer (editorial-article-ai.mjs) can turn into a draft.
// ---------------------------------------------------------------------------

// Mirrors the title-normalization key createArticleDraft() already uses to
// dedupe against existing "article" documents, so weekly Food/Travel
// candidates fall into that same canonical dedupe instead of a parallel one.
export function candidateTopicKey(topic) {
  return normalize(topic);
}

// Mirrors the publish gate in lib/generated-articles.ts (`row.status !==
// "published"` is excluded from the public pool) — a draft/candidate row is
// never publicly visible until a moderator approves it.
export function isPubliclyVisibleStatus(status) {
  return status === "published";
}

/** @param {{category: string, topic: string, signals?: *[], verifiedVenues?: *[], verifiedEvents?: *[], currentPromotions?: *[]}} options */
export function buildFoodTravelCandidate({ category, topic, signals = [], verifiedVenues = [], verifiedEvents = [], currentPromotions = [] }) {
  const strengthScore = scoreCandidateTopic({ verifiedVenues, verifiedEvents, currentPromotions, buzzSignals: signals.length });
  return {
    category,
    title: topic,
    summary: signals[0]?.summary ?? "",
    sources: signals.map((signal) => ({ title: signal.title, url: signal.url, source: signal.source, publishedAt: signal.publishedAt })),
    venues: verifiedVenues,
    events: verifiedEvents,
    promotions: currentPromotions,
    strengthScore,
    researchGeneratedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Beat scheduling: Monday = discovery/prep, Wednesday = Food revalidate +
// generate, Friday = Travel revalidate + generate. A cron beat= parameter
// always wins over the calendar so a run can be replayed/tested explicitly.
// ---------------------------------------------------------------------------

const VALID_BEATS = ["discovery", "food", "travel"];

/** @param {{now?: Date, beatParam?: string}} [options] */
export function determineRequestedBeat({ now = new Date(), beatParam } = {}) {
  if (beatParam && VALID_BEATS.includes(beatParam)) return beatParam;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kuala_Lumpur", weekday: "short" }).format(now);
  if (weekday === "Mon") return "discovery";
  if (weekday === "Wed") return "food";
  if (weekday === "Fri") return "travel";
  return null;
}

// ISO-8601 week number of the Malaysia-local calendar date, independent of
// UTC drift near week boundaries.
function isoWeekInfo(now) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = parts.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const isoWeek = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { isoYear: date.getUTCFullYear(), isoWeek };
}

// Stable identity for "this beat, this week" — e.g. food-2026-39 — stored as
// the document's editionKey so a retried/replayed run can detect an
// already-generated draft instead of creating a duplicate.
export function weeklyBeatKey(category, now = new Date()) {
  const { isoYear, isoWeek } = isoWeekInfo(now);
  return `${category}-${isoYear}-${String(isoWeek).padStart(2, "0")}`;
}

// A retry/replay for the same weekly beat key must not create a second
// draft. "already generated" means any non-terminal-rejected status: a
// candidate/approved/scheduled/published row already represents this week's
// story.
/** @param {*[]} existingDocuments @param {string} editionKey */
export function shouldSkipDuplicateWeeklyDraft(existingDocuments = [], editionKey) {
  return existingDocuments.some((doc) => doc.editionKey === editionKey && !["rejected", "expired"].includes(doc.status));
}

async function findExistingWeeklyDrafts(editionKey) {
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) return [];
  const { Client, Databases, Query } = await import("node-appwrite");
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const rows = await db.listDocuments(database, collection, [Query.equal("type", "article"), Query.equal("editionKey", editionKey), Query.limit(5)]);
  return rows.documents.map((row) => ({ id: row.$id, editionKey: row.editionKey, status: row.status }));
}

// Runs one Wednesday (food) or Friday (travel) beat: fresh discovery, fresh
// venue/event verification (fail-closed official-source rules), reject
// anything stale/expired/cancelled, then generate only if a strong enough
// verified candidate survives. Never reuses Monday's discovery output as
// verification — every beat re-fetches and re-verifies for itself.
async function runVerifiedBeat({ category, discover, dryRun, now, budget }) {
  const editionKey = weeklyBeatKey(category, now);
  try {
    const existing = await findExistingWeeklyDrafts(editionKey).catch(() => []);
    if (shouldSkipDuplicateWeeklyDraft(existing, editionKey)) {
      return { category, status: "already-generated", editionKey, existingId: existing.find((doc) => doc.editionKey === editionKey)?.id };
    }

    const signals = await discover();
    if (!signals.length) return { category, status: "skipped", editionKey, reason: "no current signal strong enough to justify a story" };

    const topic = signals[0].title;
    const venueQuery = topic.split(/[:\-–]/)[0];
    const rawVenues = await fetchFoursquareVenues(venueQuery).catch(() => []);
    const candidateVenues = rejectClosedVenues(dedupeVenues(rawVenues)).slice(0, 4);
    const venuesWithWebsite = await mapWithConcurrency(candidateVenues, async (venue) => {
      if (venue.officialWebsite || !venue.foursquareId) return venue;
      const website = await fetchFoursquarePlaceWebsite(venue.foursquareId).catch(() => null);
      return website ? { ...venue, officialWebsite: website } : venue;
    }, EXTERNAL_REQUEST_CONCURRENCY, budget);
    // A venue is only verifiable when a discovery signal or its own known
    // website independently proves official identity — never a random,
    // unverified discovery URL.
    const verifiedVenues = venuesWithWebsite
      .map((venue) => {
        const matchingSignal = signals.find((signal) => venue.officialWebsite && hostOf(signal.url) && matchesHost(hostOf(signal.url), venue.officialWebsite));
        const officialSourceUrl = matchingSignal?.url ?? venue.officialWebsite ?? null;
        return verifyVenue(venue, { officialSourceUrl });
      })
      .filter((venue) => venue.officialVerified);

    const events = category === "travel" ? await fetchTicketmasterEvents({ keyword: topic }).catch(() => []) : [];
    const verifiedEvents = events.filter((event) => isEventCurrent(event, now).officialVerified);

    const candidate = buildFoodTravelCandidate({ category, topic, signals, verifiedVenues, verifiedEvents, currentPromotions: [] });
    const selected = selectWeeklyCandidate([candidate]);
    if (!selected) return { category, status: "skipped", editionKey, reason: "no sufficiently strong, current and verifiable topic this week" };

    const { createArticleDraft } = await import("./editorial-article-ai.mjs");
    // Food & Drink is a City & Travel topic now. Keep the internal Wednesday
    // beat key as `food` for scheduler compatibility, but store the article
    // under the canonical `/travel` desk so it cannot orphan itself.
    const articleCandidate = category === "food" ? { ...selected, category: "travel" } : selected;
    if (!budget.checkpoint("food-travel-ai-draft")) return { category, status: "budget-exhausted", editionKey };
    const draft = await createArticleDraft({ candidate: articleCandidate, dryRun, autoPublish: false, editionKey });
    return { category, status: "generated", editionKey, draft };
  } catch (error) {
    return { category, status: "failed", editionKey, error: error instanceof Error ? error.message : "unknown error" };
  }
}

// Monday: broad discovery only, no verification and no draft generation.
// Wednesday/Friday always re-fetch and re-verify from scratch, so this is
// purely for early visibility/logging, never a cache the later beats trust.
async function runDiscoveryPrep() {
  const [foodSignals, travelSignals] = await Promise.all([
    discoverFoodCandidateSignals().catch(() => []),
    discoverTravelCandidateSignals().catch(() => []),
  ]);
  return {
    food: { status: "prepared", signalCount: foodSignals.length },
    travel: { status: "prepared", signalCount: travelSignals.length },
  };
}

// Entry point for the weekly Food & Drink / Travel & City Life pipeline.
// beatParam (?beat=discovery|food|travel) always overrides the Malaysia-time
// calendar detection, so a cron entry or a manual replay can force a beat.
// AUTO-PUBLISH IS INTENTIONALLY HARD-CODED OFF: every candidate that clears
// verification is still handed to createArticleDraft with
// autoPublish: false, so a successful run only adds a "candidate" draft to
// the moderator review desk.
/**
 * @param {{dryRun?: boolean, beatParam?: string, now?: Date}} [options]
 * @returns {Promise<{schedule: *, autoPublish: boolean, beat: string|null, status?: string, weeklyBeatKey?: string, food?: *, travel?: *}>}
 */
export async function runWeeklyFoodTravel({ dryRun = false, beatParam, now = new Date(), budget = createExecutionBudget({ onExhausted: (details) => console.warn("[editorial-food-travel] budget_exhausted", JSON.stringify(details)) }) } = {}) {
  const schedule = getWeeklyFoodTravelSchedule(now);
  const beat = determineRequestedBeat({ now, beatParam });
  if (!beat) return { schedule, autoPublish: false, beat: null, status: "no-beat-scheduled-today" };
  if (beat === "discovery") {
    if (!budget.checkpoint("food-travel-discovery")) return { schedule, autoPublish: false, beat, status: "budget-exhausted" };
    const prep = await runDiscoveryPrep();
    return { schedule, autoPublish: false, beat, ...prep };
  }
  const discover = beat === "food" ? discoverFoodCandidateSignals : discoverTravelCandidateSignals;
  const result = budget.checkpoint("food-travel-research") ? await runVerifiedBeat({ category: beat, discover, dryRun, now, budget }) : { category: beat, status: "budget-exhausted" };
  return { schedule, autoPublish: false, beat, [beat]: result };
}
