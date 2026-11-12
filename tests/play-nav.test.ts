import test from "node:test";
import assert from "node:assert/strict";
import { PLAY_ACTIVITIES, getOtherActivities } from "../lib/play-nav.ts";

test("getOtherActivities excludes the current activity", () => {
  const others = getOtherActivities("/play/would-you-rather");
  assert.ok(!others.some((activity) => activity.href === "/play/would-you-rather"));
});

test("getOtherActivities recommends no more than 3 activities", () => {
  const others = getOtherActivities("/play/would-you-rather");
  assert.ok(others.length <= 3);
});

test("getOtherActivities returns activities from the known set", () => {
  const others = getOtherActivities("/play/group-chat");
  for (const activity of others) {
    assert.ok(PLAY_ACTIVITIES.some((known) => known.href === activity.href));
  }
});

test("every play activity has a unique href", () => {
  const hrefs = PLAY_ACTIVITIES.map((activity) => activity.href);
  assert.equal(hrefs.length, new Set(hrefs).size);
});
