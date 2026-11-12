import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { articleTopicLinks, buildTopicIndex, getEligibleTopics, MIN_TOPIC_STORIES, tagSlug, topicPath } from "../lib/topics.ts";
import { rankRelatedArticles } from "../lib/article-discovery.ts";
import { adBoundary, bodyLayout, insertReadNext, READ_NEXT_MARKER, readNextBoundary } from "../lib/article-body.ts";
import { buildRssFeed, escapeXml } from "../lib/rss.ts";
import { findLikelyOrphans } from "../lib/orphans.ts";
import { buildMetadata } from "../lib/seo.ts";
import type { Article, ArticleSource } from "../types/article.ts";

const SITE = "https://brisastory.live";
const read = (file: string) => fs.readFileSync(file, "utf8");
let n = 0;
function story(overrides: Partial<Article> & { source?: ArticleSource } = {}): Article {
  n += 1;
  return { slug: `story-${n}`, category: "culture", title: `Story ${n}`, description: "About it", tags: [], date: `2026-09-${String(10 + (n % 18)).padStart(2, "0")}T00:00:00.000Z`, image: "/a.jpg", imageAlt: "", content: "", readingTime: "3 min read", ...overrides } as Article;
}
const sections = (count: number, words = 120) => Array.from({ length: count }, (_, i) => `${i === 0 ? "" : `## Section ${i}\n\n`}${"word ".repeat(words)}`).join("\n");

test("a topic with 3+ stories is indexable; fewer is not", () => {
  const index = buildTopicIndex([
    story({ tags: ["Skincare"] }), story({ tags: ["Skincare"] }), story({ tags: ["skincare "] }),
    story({ tags: ["Sunscreen"] }), story({ tags: ["Sunscreen"] }),
  ]);
  assert.equal(MIN_TOPIC_STORIES, 3);
  assert.equal(index.find((t) => t.slug === "skincare")?.eligible, true);
  assert.equal(index.find((t) => t.slug === "sunscreen")?.eligible, false);
  const meta = buildMetadata({ title: "Skincare stories", description: "d", path: "/topics/skincare" });
  assert.equal(meta.alternates?.canonical, `${SITE}/topics/skincare`);
  assert.equal((meta.robots as Record<string, unknown>)["max-image-preview"], "large");
  // Thin hubs have no page at all.
  assert.match(read("app/topics/[tag]/page.tsx"), /getEligibleTopics\(await getTopicIndex\(\)\)\.find/);
});

test("MDX, editorial and community stories all appear in hubs; drafts never", () => {
  const index = buildTopicIndex([
    story({ tags: ["Texting"] }), story({ tags: ["Texting"], source: "editorial", isGenerated: true }),
    story({ tags: ["Texting"], source: "community", isGenerated: true }), story({ tags: ["Texting"], status: "draft" } as Partial<Article>),
  ]);
  const topic = index.find((t) => t.slug === "texting")!;
  assert.equal(topic.count, 3);
  assert.deepEqual(new Set(topic.articles.map((a) => a.source ?? "mdx")), new Set(["mdx", "editorial", "community"]));
});

test("hubs list each URL once, newest first", () => {
  const a = story({ tags: ["Music", "music"], date: "2026-09-29T00:00:00.000Z" });
  const index = buildTopicIndex([a, story({ tags: ["Music"], date: "2026-09-21T00:00:00.000Z" }), story({ tags: ["Music"], date: "2026-09-25T00:00:00.000Z" })]);
  const topic = index.find((t) => t.slug === "music")!;
  assert.equal(topic.count, 3);
  assert.equal(topic.articles[0], a);
  assert.ok(new Date(topic.articles[1].date) > new Date(topic.articles[2].date));
});

test("tag slugs are deterministic and URL-safe", () => {
  assert.equal(tagSlug("Gen Alpha"), "gen-alpha");
  assert.equal(tagSlug("  Gen   Alpha "), "gen-alpha");
  assert.equal(tagSlug("Sex & Health"), "sex-and-health");
  assert.equal(tagSlug("Self-Care"), "self-care");
  assert.equal(tagSlug("Haunted & Strange"), "haunted-and-strange");
  assert.equal(tagSlug("Café Culture"), "cafe-culture");
  assert.equal(tagSlug("Don't Panic!"), "dont-panic");
  assert.match(tagSlug("東京"), /^topic-[0-9a-z]{6}$/);
  assert.equal(tagSlug("東京"), tagSlug("東京"));
  for (const tag of ["A/B testing", "C++", "100% real", "K-pop"]) assert.match(tagSlug(tag), /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("slug collisions are kept apart deterministically", () => {
  const make = () => buildTopicIndex([
    story({ tags: ["Sex & Health"] }), story({ tags: ["Sex & Health"] }), story({ tags: ["Sex & Health"] }),
    story({ tags: ["Sex and Health"] }), story({ tags: ["Sex and Health"] }), story({ tags: ["Sex and Health"] }),
  ]);
  const first = make(); const second = make();
  const slugs = first.map((t) => t.slug).sort();
  assert.equal(new Set(slugs).size, 2, "not merged");
  assert.deepEqual(slugs, second.map((t) => t.slug).sort());
  assert.ok(slugs.includes("sex-and-health"));
  assert.ok(slugs.some((slug) => /^sex-and-health-[0-9a-z]{6}$/.test(slug)));
});

test("tags that duplicate a public desk do not become hubs", () => {
  const index = buildTopicIndex([story({ tags: ["Travel"] }), story({ tags: ["Travel"] }), story({ tags: ["Travel"] })]);
  assert.equal(index.find((t) => t.slug === "travel")?.eligible, false);
});

test("malformed article tags do not break topic index generation", () => {
  const index = buildTopicIndex([
    story({ tags: undefined } as Partial<Article>),
    story({ tags: "Culture" } as unknown as Partial<Article>),
    story({ tags: ["Culture"] }), story({ tags: ["Culture"] }), story({ tags: ["Culture"] }),
  ]);
  assert.equal(index.find((topic) => topic.name === "Culture")?.count, 3);
});

test("article topic links use hub URLs, skip thin tags, cap at four", () => {
  const pool = ["A", "B", "C", "D", "E"].flatMap((tag) => [story({ tags: [tag] }), story({ tags: [tag] }), story({ tags: [tag] })]);
  pool.push(story({ tags: ["Thin"] }));
  const index = buildTopicIndex(pool);
  const links = articleTopicLinks({ tags: ["Thin", "A", "B", "C", "D", "E"] }, index);
  assert.deepEqual(links.map(topicPath), ["/topics/a", "/topics/b", "/topics/c", "/topics/d"]);
  assert.match(read("components/article/ArticleView.tsx"), /href=\{topicPath\(topic\)\}/);
});

test("hidden desks are not reintroduced by topic hubs", () => {
  const index = buildTopicIndex([
    story({ category: "self-care", tags: ["Sleep"] }), story({ category: "self-care", tags: ["Sleep"] }), story({ category: "entertainment", tags: ["Sleep"] }),
  ]);
  const topic = index.find((t) => t.slug === "sleep")!;
  assert.ok(!["self-care", "entertainment", "food", "social"].includes(topic.desk));
  assert.equal(topic.desk, "relationships");
  assert.match(read("app/topics/[tag]/page.tsx"), /desk && !desk\.hidden/);
});

test("sitemap lists eligible hubs only, dated by the newest qualifying story", () => {
  const newest = story({ tags: ["Fragrance"], date: "2026-09-20T00:00:00.000Z", updated: "2026-09-30T08:00:00.000Z" });
  const index = buildTopicIndex([newest, story({ tags: ["Fragrance"], date: "2026-09-25T00:00:00.000Z" }), story({ tags: ["Fragrance"], date: "2026-09-22T00:00:00.000Z" }), story({ tags: ["Thin"] })]);
  const eligible = getEligibleTopics(index);
  assert.deepEqual(eligible.map(topicPath), ["/topics/fragrance"]);
  assert.equal(eligible[0].lastModified, "2026-09-30T08:00:00.000Z");
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /getEligibleTopics\(buildTopicIndex\(articles\)\)/);
  assert.match(sitemap, /lastModified: new Date\(topic\.lastModified\)/);
});

test("related fallback fills from desk then site-wide, never the article itself", () => {
  const self = story({ category: "money", title: "Qqqq", tags: [] });
  const pool = [self, story({ category: "money", title: "Wwww" }), story({ category: "style", title: "Xxxx" }), story({ category: "travel", title: "Yyyy" })];
  const related = rankRelatedArticles(self, pool, 3);
  assert.equal(related.length, 3);
  assert.ok(!related.includes(self));
  assert.equal(related[0].category, "money");
  assert.equal(new Set(related.map((a) => `${a.category}/${a.slug}`)).size, 3);
});

test("read-next never appears in short articles", () => {
  assert.equal(readNextBoundary(sections(8), 3), null, "under 4 minutes");
  assert.equal(readNextBoundary(sections(4, 400), 8), null, "too few sections");
});

test("read-next sits 35-50% through, at a section boundary, never beside the ad", () => {
  for (const [count, minutes] of [[8, 5], [10, 5], [10, 8], [12, 9], [6, 4], [16, 12]] as const) {
    const content = sections(count, minutes * 220 / count);
    const boundary = readNextBoundary(content, minutes);
    const ad = adBoundary(content, bodyLayout(minutes));
    if (boundary === null) continue;
    assert.ok(boundary >= 2 && boundary / count >= 0.35 && boundary / count <= 0.5, `${count}/${minutes}: ${boundary}`);
    assert.notEqual(boundary, ad, "a full section always separates link and ad");
    const inserted = insertReadNext(content, boundary);
    assert.equal(inserted.split(READ_NEXT_MARKER).length, 2);
    // Marker is its own block right before a heading, never mid-paragraph.
    assert.match(inserted, new RegExp(`\\n\\n${READ_NEXT_MARKER}\\n\\n## Section ${boundary}\\n`));
    assert.equal(inserted.split(/\n(?=##\s)/).length, count, "ad/mobile splits unchanged");
  }
  assert.notEqual(readNextBoundary(sections(10, 110), 5), null, "a typical 5-minute story gets one");
});

test("feed includes all three sources, newest first, without drafts or duplicate URLs", () => {
  const items = [
    story({ slug: "mdx-one", date: "2026-09-21T00:00:00.000Z" }),
    story({ slug: "generated-one", source: "editorial", date: "2026-09-26T10:00:00.000Z" }),
    story({ slug: "community-one", source: "community", author: "Aisha K", date: "2026-09-28T09:00:00.000Z" }),
    story({ slug: "draft-one", status: "draft" } as Partial<Article>),
  ];
  const duplicate = { ...items[0], title: "Duplicate" };
  const xml = buildRssFeed([...items, duplicate], SITE);
  for (const slug of ["mdx-one", "generated-one", "community-one"]) assert.match(xml, new RegExp(`<link>${SITE}/culture/${slug}</link>`));
  assert.doesNotMatch(xml, /draft-one/);
  assert.equal(xml.match(/<guid isPermaLink="true">https:\/\/brisastory\.live\/culture\/mdx-one<\/guid>/g)?.length, 1);
  assert.ok(xml.indexOf("community-one") < xml.indexOf("generated-one"));
  assert.match(xml, /<dc:creator>Aisha K<\/dc:creator>/);
    assert.match(xml, /<dc:creator>TodayAI Editorial<\/dc:creator>/);
});

test("feed dates come from the stored date and are stable", async () => {
  const items = [story({ slug: "a", date: "2026-09-21" }), story({ slug: "b", date: "2026-09-28T09:00:00.000Z" })];
  const first = buildRssFeed(items, SITE);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(buildRssFeed(items, SITE), first);
  assert.match(first, /<pubDate>Mon, 21 Sep 2026 00:00:00 GMT<\/pubDate>/);
  assert.match(first, /<lastBuildDate>Mon, 28 Sep 2026 09:00:00 GMT<\/lastBuildDate>/);
});

test("feed escapes XML special characters and keeps Unicode", () => {
  const title = `Tom & Jerry <3 "quotes" 'apostrophes' — café 東京 😀\u0001`;
  const xml = buildRssFeed([story({ slug: "esc", title, description: "a < b && c > d", tags: ["R&B"] })], SITE);
  assert.match(xml, /<title>Tom &amp; Jerry &lt;3 &quot;quotes&quot; &apos;apostrophes&apos; — café 東京 😀<\/title>/);
  assert.match(xml, /<description>a &lt; b &amp;&amp; c &gt; d<\/description>/);
  assert.match(xml, /<category>R&amp;B<\/category>/);
  assert.doesNotMatch(xml, /\u0001/);
  assert.equal(escapeXml("<&>"), "&lt;&amp;&gt;");
  // Every tag is closed and no raw & remains outside an entity.
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/);
  assert.equal(xml.match(/<item>/g)?.length, xml.match(/<\/item>/g)?.length);
});

test("feed discovery link is in every page's metadata", () => {
  const indexable = buildMetadata({ title: "x", description: "d", path: "/x" });
  const noindex = buildMetadata({ title: "x", description: "d", path: "/x", noindex: true });
  for (const meta of [indexable, noindex]) {
    assert.deepEqual(meta.alternates?.types, { "application/rss+xml": [{ url: "/feed.xml", title: "TodayAI" }] });
  }
  assert.match(read("app/layout.tsx"), /alternates: FEED_ALTERNATES/);
  assert.match(read("app/feed.xml/route.ts"), /getDiscoverableArticles\(\)/);
});

test("orphan audit flags stories with no desk, hub or related links", () => {
  const recent = Array.from({ length: 10 }, (_, i) => story({ category: "money", title: `Budget plan ${i}`, tags: ["Budgeting"], date: `2026-09-${20 + (i % 9)}T00:00:00.000Z` }));
  const lonely = story({ category: "money", title: "Zzzz", tags: ["Unique"], date: "2026-09-01T00:00:00.000Z" });
  const orphans = findLikelyOrphans([...recent, lonely]);
  assert.deepEqual(orphans.map((a) => a.slug), [lonely.slug]);
});
