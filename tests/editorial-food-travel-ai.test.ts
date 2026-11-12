import test from "node:test";
import assert from "node:assert/strict";
import categories from "../content/categories.json" with { type: "json" };
import {
  buildFoodTravelCandidate,
  candidateTopicKey,
  dedupeVenues,
  determineRequestedBeat,
  evaluateOfficialSource,
  getWeeklyFoodTravelSchedule,
  isEventCurrent,
  isPromotionCurrent,
  isPubliclyVisibleStatus,
  normalizeVenue,
  rejectClosedVenues,
  resolveVenueImageDecision,
  runWeeklyFoodTravel,
  scoreCandidateTopic,
  selectWeeklyCandidate,
  shouldSkipDuplicateWeeklyDraft,
  verifyVenue,
  weeklyBeatKey,
} from "../lib/editorial-food-travel-ai.mjs";

// 2026-09-21 is a Monday in Malaysia time (confirmed by editorial-daily-ai's
// own Monday-theme test), so this week's Wed/Fri fall on the 23rd and 25th.
const MONDAY = new Date("2026-09-21T09:00:00+08:00");
const WEDNESDAY = new Date("2026-09-23T09:00:00+08:00");
const FRIDAY = new Date("2026-09-25T09:00:00+08:00");

const officialCafe = normalizeVenue({ name: "Kohi House", category: "Cafe", address: "12 Jalan Bukit Bintang, Kuala Lumpur", latitude: 3.146, longitude: 101.71, officialWebsite: "https://kohihouse.example.com", foursquareId: "fsq-1" });

test("one weekly Food & Drink candidate is buildable and selectable from verified signal", () => {
  const candidate = buildFoodTravelCandidate({
    category: "food",
    topic: "5 KL Cafés Worth Trying This Weekend",
    signals: [{ title: "New cafe cluster opens in Bukit Bintang", url: "https://kohihouse.example.com/news", source: "tavily" }],
    verifiedVenues: [verifyVenue(officialCafe, { officialSourceUrl: "https://kohihouse.example.com/news" })],
  });
  assert.equal(candidate.category, "food");
  const selected = selectWeeklyCandidate([candidate]);
  assert.ok(selected);
  assert.equal(selected.title, candidate.title);
});

test("one weekly Travel & City Life candidate is buildable and selectable from verified signal", () => {
  const venue = normalizeVenue({ name: "Chatuchak Weekend Market", category: "Market", address: "Kamphaeng Phet 2 Rd, Bangkok", officialWebsite: "https://chatuchakmarket.org", foursquareId: "fsq-2" });
  const candidate = buildFoodTravelCandidate({
    category: "travel",
    topic: "48 Hours in Bangkok Without Overplanning It",
    signals: [{ title: "Bangkok weekend guide trending", url: "https://chatuchakmarket.org/hours", source: "tavily" }],
    verifiedVenues: [verifyVenue(venue, { officialSourceUrl: "https://chatuchakmarket.org/hours" })],
  });
  assert.equal(candidate.category, "travel");
  const selected = selectWeeklyCandidate([candidate]);
  assert.ok(selected);
});

test("a weak week with no strong verifiable topic safely produces no article", () => {
  const weak = buildFoodTravelCandidate({ category: "food", topic: "Some vague idea", signals: [] });
  assert.equal(scoreCandidateTopic({}), 0);
  assert.equal(selectWeeklyCandidate([weak]), null);
  assert.equal(selectWeeklyCandidate([]), null);
});

test("the live weekly runner produces no article (rather than a forced one) when no discovery keys are configured", async () => {
  const food = await runWeeklyFoodTravel({ dryRun: true, beatParam: "food", now: WEDNESDAY });
  assert.equal(food.autoPublish, false);
  assert.equal(food.food?.status, "skipped");
  const travel = await runWeeklyFoodTravel({ dryRun: true, beatParam: "travel", now: FRIDAY });
  assert.equal(travel.travel?.status, "skipped");
});

test("Wednesday Food freshness actually executes (fresh discovery + verification, not just metadata)", async () => {
  const result = await runWeeklyFoodTravel({ dryRun: true, now: WEDNESDAY });
  assert.equal(result.beat, "food");
  assert.ok(result.food, "Wednesday must run the food beat, not just report a date");
  assert.equal(result.food.editionKey, weeklyBeatKey("food", WEDNESDAY));
  assert.equal(result.travel, undefined);
});

test("Friday Travel freshness actually executes (fresh discovery + verification, not just metadata)", async () => {
  const result = await runWeeklyFoodTravel({ dryRun: true, now: FRIDAY });
  assert.equal(result.beat, "travel");
  assert.ok(result.travel, "Friday must run the travel beat, not just report a date");
  assert.equal(result.travel.editionKey, weeklyBeatKey("travel", FRIDAY));
  assert.equal(result.food, undefined);
});

test("Monday discovery prep never counts as Wednesday/Friday verification", async () => {
  assert.equal(determineRequestedBeat({ now: MONDAY }), "discovery");
  const result = await runWeeklyFoodTravel({ dryRun: true, now: MONDAY });
  assert.equal(result.beat, "discovery");
  assert.equal(result.food.status, "prepared");
  assert.equal(result.travel.status, "prepared");
  // Prep results carry no editionKey/verification outcome — they must never
  // be mistaken for (or reused as) a Wednesday/Friday verified candidate.
  assert.equal(result.food.editionKey, undefined);
  assert.equal(result.food.status === "generated" || result.food.status === "skipped", false);
});

test("an explicit beat parameter overrides the calendar", () => {
  assert.equal(determineRequestedBeat({ now: MONDAY, beatParam: "food" }), "food");
  assert.equal(determineRequestedBeat({ now: WEDNESDAY, beatParam: "travel" }), "travel");
  assert.equal(determineRequestedBeat({ now: new Date("2026-09-22T09:00:00+08:00") }), null); // Tuesday: no beat
});

test("venue identity is verified only with a real official source", () => {
  const verified = verifyVenue(officialCafe, { officialSourceUrl: "https://kohihouse.example.com/news" });
  assert.equal(verified.verified, true);
  assert.equal(verified.officialVerified, true);
  assert.equal(verified.locationProvider, "foursquare");
  const unverified = verifyVenue(officialCafe, {});
  assert.equal(unverified.verified, false);
});

test("duplicate venues (same identity) are removed", () => {
  const list = dedupeVenues([officialCafe, { ...officialCafe }, normalizeVenue({ name: "Different Place", address: "1 Other St", foursquareId: "fsq-3" })]);
  assert.equal(list.length, 2);
});

test("an expired promotion between Monday's discovery and Wednesday's revalidation is rejected", () => {
  // Looked fine when discovered Monday (ends Tuesday, after Monday) but has
  // lapsed by the time Wednesday's freshness check actually runs.
  const result = isPromotionCurrent(
    { promotionTitle: "RM10 off matcha", promotionSourceUrl: "https://kohihouse.example.com/promo", promotionEnd: "2026-09-22T23:59:00+08:00" },
    WEDNESDAY,
    { trustedHosts: ["https://kohihouse.example.com"] }
  );
  assert.equal(result.current, false);
  assert.equal(result.reason, "promotion has expired");
});

test("a promotion without an official source is rejected even if the discount sounds real", () => {
  const result = isPromotionCurrent({ promotionTitle: "50% off brunch", promotionSourceUrl: "https://retailmenot.com/deal/123", promotionEnd: "2026-12-31T00:00:00Z" }, new Date("2026-09-22"));
  assert.equal(result.current, false);
});

test("a past event is rejected", () => {
  const result = isEventCurrent({ eventName: "Night Market Fest", eventDate: "2020-01-01T00:00:00Z", source: "ticketmaster", ticketUrl: "https://ticketmaster.com/event/1" }, new Date("2026-09-22"));
  assert.equal(result.current, false);
});

test("a cancelled/past event between Monday's discovery and Friday's revalidation is rejected", () => {
  // Looked upcoming when discovered Monday, but by Friday's check its date
  // has already passed (postponed/cancelled or simply already happened).
  const result = isEventCurrent(
    { eventName: "Night Market Pop-Up", eventDate: "2026-09-24T20:00:00+08:00", source: "ticketmaster", ticketUrl: "https://www.ticketmaster.com/event/night-market" },
    FRIDAY
  );
  assert.equal(result.current, false);
  assert.equal(result.reason, "event has already happened");
});

test("an unknown, non-blacklisted domain is NOT automatically treated as official (fail closed)", () => {
  const result = evaluateOfficialSource("https://randomfoodblog.example.net/post/123");
  assert.equal(result.officialVerified, false);
  assert.equal(result.reason, "official identity could not be established for this domain");
});

test("the exact official venue domain passes", () => {
  const result = evaluateOfficialSource("https://kohihouse.example.com/menu", { trustedHosts: ["https://kohihouse.example.com"] });
  assert.equal(result.officialVerified, true);
});

test("Ticketmaster is accepted only as the authoritative ticketing listing, not as a generic official source", () => {
  const asTicketing = evaluateOfficialSource("https://www.ticketmaster.com/event/123", { allowTicketmaster: true });
  assert.equal(asTicketing.officialVerified, true);
  const withoutFlag = evaluateOfficialSource("https://www.ticketmaster.com/event/123", { allowTicketmaster: false });
  assert.equal(withoutFlag.officialVerified, false);
});

test("a venue-focused story requires an exact verified venue image", () => {
  const missing = resolveVenueImageDecision({ requiresExactImage: true, exactImageUrl: null });
  assert.equal(missing.needsImageReview, true);
  assert.equal(missing.isExactImage, false);
  const stock = resolveVenueImageDecision({ requiresExactImage: true, exactImageUrl: "https://pexels.com/random-cafe.jpg", exactImageSourceType: "pexels" });
  assert.equal(stock.needsImageReview, true);
  const exact = resolveVenueImageDecision({ requiresExactImage: true, exactImageUrl: "https://kohihouse.example.com/photo.jpg", exactImageSourceType: "official-venue" });
  assert.equal(exact.needsImageReview, false);
  assert.equal(exact.isExactImage, true);
});

test("a generic city guide may use editorial (Pexels-style) imagery", () => {
  const generic = resolveVenueImageDecision({ requiresExactImage: false, editorialImage: { image: "https://pexels.com/kl-skyline.jpg", imageSourceType: "pexels" } });
  assert.equal(generic.needsImageReview, false);
  assert.equal(generic.requiresExactImage, false);
});

test("a permanently closed venue is rejected even if it otherwise matched", () => {
  const closed = normalizeVenue({ name: "Old Diner", address: "9 Jalan Lama", permanentlyClosed: true, foursquareId: "fsq-4" });
  assert.equal(rejectClosedVenues([officialCafe, closed]).length, 1);
  const verified = verifyVenue(closed, { officialSourceUrl: "https://old-diner.example.com" });
  assert.equal(verified.verified, false);
});

test("weekly Food/Travel candidates dedupe against the canonical article title key", () => {
  assert.equal(candidateTopicKey("5 KL Cafés Worth Trying This Weekend"), candidateTopicKey("5 kl CAFÉS worth trying this weekend!"));
});

test("drafts are not treated as publicly visible", () => {
  assert.equal(isPubliclyVisibleStatus("candidate"), false);
  assert.equal(isPubliclyVisibleStatus("draft"), false);
  assert.equal(isPubliclyVisibleStatus("published"), true);
});

test("an eventually published article carries the correct canonical category", () => {
  const food = categories.find((category) => category.slug === "food");
  const travel = categories.find((category) => category.slug === "travel");
  assert.equal(food?.name, "Food & Drink");
  assert.equal(travel?.name, "Travel & City Life");
  const foodCandidate = buildFoodTravelCandidate({ category: "food", topic: "x", signals: [] });
  const travelCandidate = buildFoodTravelCandidate({ category: "travel", topic: "y", signals: [] });
  assert.equal(foodCandidate.category, "food");
  assert.equal(travelCandidate.category, "travel");
});

test("the weekly schedule uses Malaysia time for both beats", () => {
  const schedule = getWeeklyFoodTravelSchedule(new Date("2026-09-22T00:00:00Z"));
  assert.equal(schedule.timezone, "Asia/Kuala_Lumpur");
  assert.ok(schedule.food.generateAt < schedule.travel.generateAt || schedule.food.dateKey !== schedule.travel.dateKey);
  assert.match(schedule.food.generateAt, /^\d{4}-\d{2}-\d{2}T01:00:00\.000Z$/);
  assert.match(schedule.travel.generateAt, /^\d{4}-\d{2}-\d{2}T01:00:00\.000Z$/);
});

test("the same beat, same week always produces the same stable weekly key", () => {
  assert.equal(weeklyBeatKey("food", WEDNESDAY), weeklyBeatKey("food", new Date("2026-09-23T23:00:00+08:00")));
  assert.notEqual(weeklyBeatKey("food", WEDNESDAY), weeklyBeatKey("travel", WEDNESDAY));
  assert.match(weeklyBeatKey("food", WEDNESDAY), /^food-\d{4}-\d{2}$/);
});

test("a retry for an already-generated weekly beat does not create a duplicate draft", () => {
  const key = weeklyBeatKey("food", WEDNESDAY);
  const existing = [{ editionKey: key, status: "candidate" }];
  assert.equal(shouldSkipDuplicateWeeklyDraft(existing, key), true);
  // A rejected/expired prior attempt must not block a fresh retry.
  assert.equal(shouldSkipDuplicateWeeklyDraft([{ editionKey: key, status: "rejected" }], key), false);
  // A different week's key must never collide.
  const nextWeek = new Date(WEDNESDAY.getTime() + 7 * 86400000);
  assert.equal(shouldSkipDuplicateWeeklyDraft(existing, weeklyBeatKey("food", nextWeek)), false);
});
