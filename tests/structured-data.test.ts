import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { articleJsonLd, articleSchemaType, contributorProfilePath, OFFICIAL_PROFILES, organizationJsonLd, resolveArticleAuthor, serializeJsonLd, websiteJsonLd } from "../lib/structured-data.ts";
import { toCommunityArticle, toEditorialArticle } from "../lib/article-sources.ts";
import { hasIndexableImage } from "../lib/article-discovery.ts";
import { breadcrumbListJsonLd, getArticleBreadcrumbs } from "../lib/breadcrumbs.ts";
import type { Article } from "../types/article.ts";

const SITE = "https://brisastory.live";
const read = (file: string) => fs.readFileSync(file, "utf8");
const mdx = (overrides: Partial<Article> = {}) => ({ slug: "s", category: "culture", title: "T", description: "D", tags: [], date: "2026-09-21", image: "/a.jpg", imageAlt: "", content: "", readingTime: "1 min read", ...overrides }) as Article;
const community = (name?: string) => toCommunityArticle({ $id: "c1", source: "community", status: "published", slug: "my-story", category: "relationships", title: "My story", content: JSON.stringify({ blocks: [{ type: "paragraph", text: "Hello there" }] }), publishedAt: "2026-09-28T09:00:00.000Z", ...(name ? { displayNameSnapshot: name } : {}) })!;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

test("visible byline, meta author and schema author share one identity", () => {
  for (const article of [mdx(), community("Aisha K")]) {
    const author = resolveArticleAuthor(article);
    const ld = articleJsonLd(article, { siteUrl: SITE, url: `${SITE}/x`, section: "X" });
    assert.equal(ld.author.name, author.name);
  }
  const view = read("components/article/ArticleView.tsx");
  assert.match(view, /const author = resolveArticleAuthor\(article\)/);
  assert.match(view, /\{author\.name\}/);
  assert.match(view, /<AuthorInfo author=\{author\} \/>/);
  assert.doesNotMatch(view, /By TodayAI Editorial/);
  assert.match(read("app/[category]/[slug]/page.tsx"), /author: resolveArticleAuthor\(article\)\.name/);
});

test("community contributor names are preserved", () => {
  const author = resolveArticleAuthor(community("Aisha K"));
  assert.deepEqual(author, { name: "Aisha K", kind: "person", profilePath: "/community/contributors/Aisha-K" });
  assert.notEqual(author.name, "BrisaStory Editorial");
});

test("contributor schema links the real profile only when it round-trips", () => {
  const ld = articleJsonLd(community("Aisha K"), { siteUrl: SITE, url: `${SITE}/relationships/my-story`, section: "Relationships" });
  assert.deepEqual(ld.author, { "@type": "Person", name: "Aisha K", url: `${SITE}/community/contributors/Aisha-K` });
  assert.equal(contributorProfilePath("Mary-Jane"), undefined, "hyphen would decode to a different name");
  assert.equal(contributorProfilePath("Community contributor"), undefined);
  assert.equal(resolveArticleAuthor(community()).profilePath, undefined, "missing display name gets no profile");
  // Matches decodeName() in the contributor route.
  const segment = decodeURIComponent(contributorProfilePath("José Ramos")!.split("/").pop()!);
  assert.equal(segment.replace(/-/g, " "), "José Ramos");
});

test("organization authors are not fake Person profiles", () => {
  for (const article of [mdx(), mdx({ author: "TodayAI Editorial" }), toEditorialArticle({ $id: "e", $createdAt: "2026-09-25T00:00:00Z", status: "published", payload: JSON.stringify({ slug: "g", category: "culture", bodyMarkdown: "Body", title: "G" }) })!]) {
    const ld = articleJsonLd(article, { siteUrl: SITE, url: `${SITE}/x`, section: "X" });
    assert.deepEqual(ld.author, { "@type": "Organization", name: "TodayAI Editorial", url: `${SITE}/editorial-policy` });
  }
});

test("SEO JSON-LD is server-rendered, never through next/script", () => {
  for (const file of [...walk("app"), ...walk("components")]) {
    const source = read(file);
    assert.doesNotMatch(source, /<Script[^>]*application\/ld\+json/, file);
  }
  for (const file of ["app/layout.tsx", "components/article/ArticleView.tsx", "components/category/CategoryPage.tsx", "components/play/PlaySeo.tsx"]) {
    assert.match(read(file), /<JsonLd data=/, file);
  }
  assert.match(read("components/seo/JsonLd.tsx"), /<script type="application\/ld\+json"/);
});

test("JSON-LD serialization cannot close the script tag", () => {
  const out = serializeJsonLd({ headline: "</script><script>alert(1)</script> & \u2028" });
  assert.doesNotMatch(out, /<\/script/i);
  assert.doesNotMatch(out, /[<>\u2028]/);
  assert.equal(JSON.parse(out).headline, "</script><script>alert(1)</script> & \u2028");
});

test("datePublished and dateModified are valid and non-empty", () => {
  for (const article of [mdx(), mdx({ updated: "2026-09-25" }), community("Aisha K")]) {
    const ld = articleJsonLd(article, { siteUrl: SITE, url: `${SITE}/x`, section: "X" });
    for (const value of [ld.datePublished, ld.dateModified]) assert.ok(value && !Number.isNaN(new Date(value).getTime()));
  }
});

test("fallback editorial image is omitted from article schema", () => {
  const article = community("Aisha K");
  assert.equal(hasIndexableImage(article.image), false);
  const ld = articleJsonLd(article, { siteUrl: SITE, url: `${SITE}/x`, section: "X", image: undefined });
  assert.equal("image" in ld, false);
  assert.match(read("components/article/ArticleView.tsx"), /hasIndexableImage\(heroImage\) \? new URL/);
});

test("image dimensions are never fabricated", () => {
  const route = read("app/[category]/[slug]/page.tsx");
  assert.doesNotMatch(route, /imageWidth|imageHeight/);
  const home = read("app/page.tsx");
  assert.match(home, /image: "\/BrisaStory\.jpg"/);
  // True size of public/BrisaStory.jpg: read the JPEG SOF0/SOF2 header.
  const jpg = fs.readFileSync("public/BrisaStory.jpg");
  let offset = 2; let size: [number, number] | undefined;
  while (offset < jpg.length) {
    const marker = jpg[offset + 1]; const length = jpg.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) { size = [jpg.readUInt16BE(offset + 7), jpg.readUInt16BE(offset + 5)]; break; }
    offset += 2 + length;
  }
  assert.ok(size);
  assert.match(home, new RegExp(`imageWidth: ${size[0]},\\s*imageHeight: ${size[1]},`));
  const png = fs.readFileSync("public/icon.png");
  const org = organizationJsonLd(SITE);
  assert.deepEqual([org.logo.width, org.logo.height], [png.readUInt32BE(16), png.readUInt32BE(20)]);
  assert.ok(org.logo.width >= 112);
});

test("breadcrumb schema keeps the Phase 2 public desk mapping", () => {
  const ld = breadcrumbListJsonLd(getArticleBreadcrumbs("self-care", "sleep", "Sleep"), SITE);
  assert.equal(ld.itemListElement[1].item, `${SITE}/relationships`);
  assert.equal(breadcrumbListJsonLd(getArticleBreadcrumbs("entertainment", "x", "X"), SITE).itemListElement[1].item, `${SITE}/culture`);
});

test("homepage title contains TodayAI once", () => {
  const home = read("app/page.tsx");
  const title = home.match(/const HOME_TITLE = "([^"]+)"/)?.[1] ?? "";
  assert.equal(title.match(/TodayAI/g)?.length, 1);
  assert.match(home, /title: \{ absolute: HOME_TITLE \}/);
});

test("no invented sameAs profiles; SearchAction matches the real ?q= search", () => {
  assert.deepEqual(OFFICIAL_PROFILES, []);
  assert.equal("sameAs" in organizationJsonLd(SITE), false);
  const site = websiteJsonLd(SITE);
  assert.equal(site.potentialAction.target.urlTemplate, `${SITE}/search?q={search_term_string}`);
  assert.match(read("components/search/SearchClient.tsx"), /params\.get\("q"\)/);
});

test("WebSite preserves the alternate spaced brand name", () => {
  const site = websiteJsonLd(SITE);
  assert.equal(site.name, "TodayAI");
  assert.equal(site.alternateName, "Today AI");
  assert.equal(site["@id"], `${SITE}/#website`);
});

test("schema type comes only from the validated articleType", () => {
  assert.equal(articleSchemaType({ articleType: "reported_story" }), "NewsArticle");
  assert.equal(articleSchemaType({ articleType: "guide" }), "Article");
  assert.equal(articleSchemaType({}), "Article");
  assert.equal(articleJsonLd(mdx(), { siteUrl: SITE, url: `${SITE}/x`, section: "X" })["@type"], "Article");
});
