import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildMetadata, isCategoryUiState } from "../lib/seo.ts";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("indexable pages allow large image previews", () => {
  const meta = buildMetadata({ title: "Culture", description: "d", path: "/culture" });
  assert.deepEqual(meta.robots, {
    index: true,
    follow: true,
    "max-image-preview": "large",
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  });
});

test("homepage canonical is the absolute site root", () => {
  const meta = buildMetadata({ title: "Home", description: "d", path: "/" });
  assert.equal(meta.alternates?.canonical, "https://brisastory.live/");
});

test("root layout does not hand the homepage canonical to other routes", () => {
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(layout, /canonical:/);
  assert.match(layout, /alternates: FEED_ALTERNATES/);
  assert.doesNotMatch(layout, /openGraph:[^}]*\burl:/);
});

test("audited routes declare their own metadata or redirect", () => {
  const redirecting = ["app/music/page.tsx", "app/community/write/page.tsx"];
  for (const file of redirecting) assert.match(read(file), /redirect\(/, file);
  const own = {
    "app/community/page.tsx": "/community",
    "app/community/status/layout.tsx": "/community/status",
    "app/community/contributors/[name]/page.tsx": "/community/contributors/",
    "app/play/group-chat/page.tsx": "/play/group-chat",
  };
  for (const [file, path] of Object.entries(own)) {
    const source = read(file);
    assert.match(source, /buildMetadata\(/, file);
    assert.ok(source.includes(`path: \`${path}`) || source.includes(`path: "${path}"`), `${file} canonical path`);
  }
});

test("a route canonical is its own URL, not the homepage", () => {
  const meta = buildMetadata({ title: "Group chat", description: "d", path: "/play/group-chat" });
  assert.equal(meta.alternates?.canonical, "https://brisastory.live/play/group-chat");
});

test("category page 1 is indexable with a self canonical", () => {
  assert.equal(isCategoryUiState(undefined, undefined), false);
  assert.equal(isCategoryUiState(undefined, "1"), false);
  const meta = buildMetadata({ title: "Culture", description: "d", path: "/culture", noindex: isCategoryUiState() });
  assert.equal(meta.alternates?.canonical, "https://brisastory.live/culture");
  assert.equal((meta.robots as { index: boolean }).index, true);
});

test("category pagination is noindex, follow with no canonical", () => {
  assert.equal(isCategoryUiState(undefined, "2"), true);
  const meta = buildMetadata({ title: "Culture", description: "d", path: "/culture", noindex: isCategoryUiState(undefined, "2") });
  assert.deepEqual(meta.robots, { index: false, follow: true, googleBot: { index: false, follow: true } });
  assert.equal(meta.alternates?.canonical, undefined);
});

test("category filters are noindex, follow", () => {
  assert.equal(isCategoryUiState("Internet Culture", undefined), true);
  const meta = buildMetadata({ title: "Culture", description: "d", path: "/culture", noindex: isCategoryUiState("Internet Culture") });
  assert.equal((meta.robots as { index: boolean; follow: boolean }).index, false);
  assert.equal((meta.robots as { index: boolean; follow: boolean }).follow, true);
  assert.match(read("app/[category]/page.tsx"), /noindex: Boolean\(meta\.hidden\) \|\| isCategoryUiState\(filter, page\)/);
});

test("moderator and admin routes are noindex", () => {
  for (const file of ["app/story-review-7q4m9x/page.tsx", "app/admin/curation/page.tsx", "app/community/status/layout.tsx"]) {
    assert.match(read(file), /noindex: true/, file);
  }
});
