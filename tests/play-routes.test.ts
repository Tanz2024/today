import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import nextConfig from "../next.config.ts";
import { PLAY_ACTIVITIES } from "../lib/play-nav.ts";
import { SECONDARY_LINKS } from "../lib/nav.ts";

test("the three Play games have their own routes", () => {
  for (const game of ["obby", "rush", "breaker"]) {
    assert.ok(fs.existsSync(`app/play/${game}/page.tsx`), `/play/${game} is missing`);
  }
  assert.equal(fs.existsSync("app/play/words/page.tsx"), false);
  assert.ok(fs.existsSync("app/play/page.tsx"));
});

test("old This-or-That links redirect permanently to the Play hub", async () => {
  const redirects = await nextConfig.redirects?.();
  const rule = redirects?.find((item) => item.source === "/play/this-or-that");
  assert.ok(rule, "redirect exists");
  assert.equal(rule.destination, "/play");
  assert.equal(rule.permanent, true);
  assert.equal(fs.existsSync("app/play/this-or-that/page.tsx"), false);
});

test("navigation no longer points at This or That", () => {
  const hrefs = [...PLAY_ACTIVITIES, ...SECONDARY_LINKS].map((link) => link.href);
  assert.ok(!hrefs.includes("/play/this-or-that"));
  assert.ok(SECONDARY_LINKS.some((link) => link.href === "/play"));
});

test("the gaming hub moved to /gaming and links back there", () => {
  assert.ok(fs.existsSync("app/gaming/page.tsx"));
  assert.ok(fs.readFileSync("components/gaming/GamingLanding.tsx", "utf8").includes('href="/gaming"'));
});
