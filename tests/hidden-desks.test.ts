import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import nextConfig from "../next.config.ts";
import { CATEGORIES, getPublicDeskSlug } from "../lib/categories.ts";
import { breadcrumbListJsonLd, getArticleBreadcrumbs } from "../lib/breadcrumbs.ts";

const SITE = "https://brisastory.live";
const hidden = CATEGORIES.filter((category) => category.hidden).map((category) => category.slug);
const read = (path: string) => fs.readFileSync(path, "utf8");

test("every hidden desk landing page redirects, has its own public hub, or is noindex", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const ownHub = new Set(["gaming"]);
  assert.ok(fs.existsSync("app/gaming/page.tsx"), "gaming hub exists");
  for (const slug of hidden) {
    if (ownHub.has(slug)) continue;
    const rule = redirects.find((item) => item.source === `/${slug}`);
    assert.ok(rule, `/${slug} redirects`);
    assert.equal(rule.destination, `/${getPublicDeskSlug(slug)}`);
    assert.equal(CATEGORIES.find((c) => c.slug === getPublicDeskSlug(slug))?.hidden, undefined, `${slug} target is public`);
  }
  // Fallback if the template is ever reached for a hidden desk.
  assert.match(read("app/[category]/page.tsx"), /noindex: Boolean\(meta\.hidden\)/);
});

test("hidden desk article URLs are not redirected", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  for (const slug of ["entertainment", "self-care", "gaming"]) {
    assert.equal(redirects.some((item) => item.source.startsWith(`/${slug}/`)), false, slug);
  }
});

test("hidden desk landing pages are absent from the sitemap", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /getPublicCategories\(\)/);
  const staticRoutes = sitemap.slice(sitemap.indexOf("STATIC_ROUTES = ["), sitemap.indexOf("];"));
  for (const slug of hidden.filter((slug) => slug !== "gaming")) {
    assert.doesNotMatch(staticRoutes, new RegExp(`"/${slug}"`), slug);
  }
  // Articles are still listed for every category, hidden or not.
  assert.match(sitemap, /const articles = await getDiscoverableArticles\(\);\n  for \(const article of articles\)/);
});

test("articles on hidden desks stay indexable", () => {
  const route = read("app/[category]/[slug]/page.tsx");
  assert.doesNotMatch(route, /noindex/);
  assert.match(route, /path: `\/\$\{category\}\/\$\{slug\}`/);
});

test("article breadcrumb uses the public desk", () => {
  assert.deepEqual(getArticleBreadcrumbs("entertainment", "film", "A Film"), [
    { name: "Home", path: "/" },
    { name: "Culture", path: "/culture" },
    { name: "A Film", path: "/entertainment/film" },
  ]);
  assert.equal(getArticleBreadcrumbs("self-care", "sleep", "Sleep")[1].path, "/relationships");
  assert.equal(getArticleBreadcrumbs("food", "x", "X")[1].path, "/travel");
  assert.equal(getArticleBreadcrumbs("social", "x", "X")[1].path, "/culture");
  assert.equal(getArticleBreadcrumbs("gaming", "x", "X")[1].path, "/gaming");
  assert.equal(getArticleBreadcrumbs("money", "x", "X")[1].path, "/money");
});

test("BreadcrumbList schema matches the visible breadcrumb", () => {
  for (const category of [...hidden, "culture", "money"]) {
    const items = getArticleBreadcrumbs(category, "story", "Story");
    const ld = breadcrumbListJsonLd(items, SITE);
    assert.equal(ld.itemListElement.length, items.length);
    items.forEach((item, index) => {
      const entry = ld.itemListElement[index];
      assert.equal(entry.position, index + 1);
      assert.equal(entry.item, item.path === "/" ? SITE : `${SITE}${item.path}`);
      if (index > 0) assert.equal(entry.name, item.name);
    });
    for (const slug of hidden.filter((slug) => slug !== "gaming")) {
      assert.notEqual(ld.itemListElement[1].item, `${SITE}/${slug}`, `${category} crumb avoids /${slug}`);
    }
  }
  const view = read("components/article/ArticleView.tsx");
  assert.match(view, /<Breadcrumbs items=\{breadcrumbs\} \/>/);
  assert.match(view, /breadcrumbListJsonLd\(breadcrumbs, siteUrl\)/);
});
