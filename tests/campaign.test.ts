import test from "node:test";
import assert from "node:assert/strict";
import { buildShareCampaignUrl } from "../lib/campaign.ts";

const cases = [
  ["reddit", "reddit", "social"],
  ["whatsapp", "whatsapp", "social"],
  ["telegram", "telegram", "social"],
  ["x", "x", "social"],
  ["facebook", "facebook", "social"],
  ["native", "native_share", "share"],
  ["copy", "copy_link", "share"],
] as const;

for (const [platform, source, medium] of cases) {
  test(`${platform} produces a tracked article URL`, () => {
    const result = new URL(buildShareCampaignUrl("https://brisastory.live/culture/what-is-whimsymaxxing", platform, "what-is-whimsymaxxing"));
    assert.equal(result.pathname, "/culture/what-is-whimsymaxxing");
    assert.equal(result.searchParams.get("utm_source"), source);
    assert.equal(result.searchParams.get("utm_medium"), medium);
    assert.equal(result.searchParams.get("utm_campaign"), "article_share");
    assert.equal(result.searchParams.get("utm_content"), "what-is-whimsymaxxing");
  });
}

test("preserves existing query parameters and normalizes content", () => {
  const result = new URL(buildShareCampaignUrl("https://brisastory.live/story?ref=home&lang=en", "reddit", " Hello, Whimsymaxxing! "));
  assert.equal(result.searchParams.get("ref"), "home");
  assert.equal(result.searchParams.get("lang"), "en");
  assert.equal(result.searchParams.get("utm_content"), "hello-whimsymaxxing");
});
