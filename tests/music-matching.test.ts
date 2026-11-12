import test from "node:test";
import assert from "node:assert/strict";
import { cleanMusicText, isCanonicalSpotifyTrack, normalizeListenBrainz, scoreSpotifyMatch } from "../lib/editorial-providers.mjs";
import { calculateMusicScores, calculatePeriodMomentum } from "../lib/editorial-weekly-runner.mjs";

const candidate = { title: "Pink + White", subtitle: "Frank Ocean" };
test("Spotify exact match is accepted", () => assert.equal(scoreSpotifyMatch(candidate, { name: "Pink + White", artists: [{ name: "Frank Ocean" }] }), 1));
test("normalized Spotify match is accepted", () => assert.ok(scoreSpotifyMatch({ title: "Pink & White", subtitle: "Frank Ocean feat. Guest" }, { name: "Pink + White", artists: [{ name: "Frank Ocean" }] }) >= 0.9));
test("bad Spotify match is rejected", () => assert.equal(scoreSpotifyMatch(candidate, { name: "White Ferrari", artists: [{ name: "Frank Ocean" }] }), 0));
test("music normalization is deterministic", () => assert.equal(cleanMusicText("  Frank Ocean (Live) "), "frank ocean live"));
test("momentum rewards a genuine weekly surge", () => {
  const metadata = { sourcePeriodStart: "2026-09-14T00:00:00.000Z", sourcePeriodEnd: "2026-09-21T00:00:00.000Z", previousPeriodStart: "2026-09-07T00:00:00.000Z", previousPeriodEnd: "2026-09-14T00:00:00.000Z", sourceLastUpdated: "2026-09-20T23:00:00.000Z" };
  const [surging] = calculateMusicScores([{ ...metadata, currentWeeklyListens: 8000, previousWeeklyListens: 1500, releaseDate: "2019-01-01" }], new Date("2026-09-21"));
  const [stable] = calculateMusicScores([{ ...metadata, currentWeeklyListens: 8000, previousWeeklyListens: 7900, releaseDate: "2019-01-01" }], new Date("2026-09-21"));
  assert.ok((surging.momentumScore ?? 0) > (stable.momentumScore ?? 0));
  assert.equal(surging.freshnessScore, 0);
});
test("missing previous data does not fabricate growth", () => {
  const [score] = calculateMusicScores([{ currentWeeklyListens: 100, releaseDate: "2026-09-20" }], new Date("2026-09-21"));
  assert.equal(score.weeklyGrowthRate, undefined);
  assert.equal(score.momentumScore, 0);
});
test("a weak new release cannot win on freshness alone", () => {
  const [newSong, strongSong] = calculateMusicScores([
    { currentWeeklyListens: 100, previousWeeklyListens: 90, releaseDate: "2026-09-20" },
    { currentWeeklyListens: 10000, previousWeeklyListens: 1000, releaseDate: "2019-01-01" },
  ], new Date("2026-09-21"));
  assert.ok(strongSong.finalScore > newSong.finalScore);
});
test("canonical matching rejects alternate Spotify versions", () => {
  assert.equal(isCanonicalSpotifyTrack({ title: "Pink + White", subtitle: "Frank Ocean" }, { name: "Pink + White (Live)", artists: [{ name: "Frank Ocean" }] }), false);
  assert.equal(isCanonicalSpotifyTrack({ title: "Pink + White (Live)", subtitle: "Frank Ocean" }, { name: "Pink + White (Live)", artists: [{ name: "Frank Ocean" }] }), true);
});
test("ListenBrainz periods and source metadata are preserved", () => {
  const current = [{ recording_mbid: "track-1", track_name: "Now", artist_name: "Artist", listen_count: 100 }];
  const previous = new Map([["track-1", { listen_count: 50 }]]);
  const [item] = normalizeListenBrainz(current, previous, { from_ts: 1000, to_ts: 2000, last_updated: 1500 });
  assert.equal(item.currentWeeklyListens, 100);
  assert.equal(item.previousWeeklyListens, 50);
  assert.equal(item.sourceRange, "this_week");
  assert.equal(item.sourcePeriodStart, new Date(1000 * 1000).toISOString());
});
const periods = { sourcePeriodStart: "2026-09-14T00:00:00.000Z", sourcePeriodEnd: "2026-09-21T00:00:00.000Z", previousPeriodStart: "2026-09-07T00:00:00.000Z", previousPeriodEnd: "2026-09-14T00:00:00.000Z", sourceLastUpdated: "2026-09-20T23:00:00.000Z" };
test("full week versus full week uses raw growth", () => assert.equal(calculatePeriodMomentum({ ...periods, currentWeeklyListens: 120, previousWeeklyListens: 100 }, new Date("2026-09-21T01:00:00.000Z")).momentumMethod, "full-period-comparison"));
test("partial current period uses normalized rates", () => assert.equal(calculatePeriodMomentum({ ...periods, sourcePeriodStart: "2026-09-20T16:00:00.000Z", currentWeeklyListens: 12, previousWeeklyListens: 100 }, new Date("2026-09-21T01:00:00.000Z")).momentumMethod, "normalized-partial-period"));
test("stale source data makes momentum unavailable", () => assert.equal(calculatePeriodMomentum({ ...periods, currentWeeklyListens: 120, previousWeeklyListens: 100, sourceLastUpdated: "2026-09-17T00:00:00.000Z" }, new Date("2026-09-21T01:00:00.000Z")).momentumMethod, "unavailable"));
test("a genuine decline remains negative", () => assert.ok((calculatePeriodMomentum({ ...periods, currentWeeklyListens: 80, previousWeeklyListens: 100 }, new Date("2026-09-21T01:00:00.000Z")).normalizedGrowth ?? 0) < 0));
test("a genuine surge remains positive", () => assert.ok((calculatePeriodMomentum({ ...periods, currentWeeklyListens: 200, previousWeeklyListens: 100 }, new Date("2026-09-21T01:00:00.000Z")).normalizedGrowth ?? 0) > 0));
