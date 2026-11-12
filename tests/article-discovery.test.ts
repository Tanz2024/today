import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { listAllDocuments, loadRemoteArticles, toCommunityArticle, toEditorialArticle, type DocumentLister } from "../lib/article-sources.ts";
import { countTopics, hasIndexableImage, mergeArticleSources, normalizeArticleTags, rankRelatedArticles, toArticleSummary, toSearchEntry } from "../lib/article-discovery.ts";
import { formatReadingTime } from "../lib/reading-time.ts";
import { FALLBACK_IMAGE } from "../lib/images.ts";
import type { Article } from "../types/article.ts";

type Doc = Record<string, unknown> & { $id: string };
const COLLECTIONS = { databaseId: "db", editorialCollectionId: "editorial", communityCollectionId: "community" };

// Minimal in-memory Appwrite: honours equal(), limit() and cursorAfter().
function mockDb(data: Record<string, Doc[]>) {
  const calls: string[][] = [];
  const db: DocumentLister = {
    async listDocuments(_database, collection, queries = []) {
      calls.push(queries);
      let rows = data[collection] ?? [];
      let limit = 25;
      for (const raw of queries) {
        const query = JSON.parse(raw) as { method: string; attribute?: string; values: unknown[] };
        if (query.method === "equal") rows = rows.filter((row) => query.values.includes(row[query.attribute!]));
        if (query.method === "limit") limit = Number(query.values[0]);
        if (query.method === "cursorAfter") rows = rows.slice(rows.findIndex((row) => row.$id === query.values[0]) + 1);
      }
      return { documents: rows.slice(0, limit) };
    },
  };
  return { db, calls };
}

const body = (words: number) => Array.from({ length: words }, (_, i) => `word${i}`).join(" ");

function editorialRow(i: number, overrides: Record<string, unknown> = {}): Doc {
  return {
    $id: `e${String(i).padStart(4, "0")}`, $createdAt: "2026-09-25T00:00:00.000Z", type: "article", status: "published",
    payload: JSON.stringify({ slug: `generated-${i}`, category: "culture", title: `Generated story ${i}`, description: "A generated story", bodyMarkdown: body(440), tags: ["Internet Culture"], image: "https://images.example.com/photo.jpg", publishAt: "2026-09-26T10:00:00.000Z", readingTime: "5 min read", ...overrides }),
  };
}

function communityRow(i: number, overrides: Record<string, unknown> = {}): Doc {
  return {
    $id: `c${String(i).padStart(4, "0")}`, $createdAt: "2026-09-27T00:00:00.000Z", source: "community", status: "published",
    slug: `community-${i}`, category: "relationships", title: `Community story ${i}`, description: "A reader's story",
    content: JSON.stringify({ blocks: [{ type: "paragraph", text: body(660) }] }), tags: "Texting", publishedAt: "2026-09-28T09:00:00.000Z",
    displayNameSnapshot: "Aisha K", ...overrides,
  };
}

function mdx(overrides: Partial<Article>): Article {
  return { slug: "mdx", category: "culture", title: "MDX story", description: "", tags: [], date: "2026-09-21T00:00:00.000Z", image: "/a.jpg", imageAlt: "", content: "", readingTime: "3 min read", ...overrides } as Article;
}

test("all 250 generated records are discovered, in pages of 100", async () => {
  const { db, calls } = mockDb({ editorial: Array.from({ length: 250 }, (_, i) => editorialRow(i)) });
  const articles = await loadRemoteArticles(db, COLLECTIONS);
  assert.equal(articles.length, 250);
  assert.ok(articles.some((a) => a.slug === "generated-249"));
  const editorialCalls = calls.filter((q) => q.some((s) => s.includes('"article"')));
  assert.equal(editorialCalls.length, 3, "ceil(250/100) list requests, no per-article reads");
});

test("all 150 community records are discovered", async () => {
  const { db } = mockDb({ community: Array.from({ length: 150 }, (_, i) => communityRow(i)) });
  const articles = await loadRemoteArticles(db, COLLECTIONS);
  assert.equal(articles.filter((a) => a.source === "community").length, 150);
  assert.ok(articles.some((a) => a.slug === "community-149"));
});

test("pagination warns instead of silently stopping at the safety bound", async () => {
  const { db } = mockDb({ x: Array.from({ length: 30 }, (_, i) => ({ $id: `x${String(i).padStart(3, "0")}` })) });
  const warn = console.warn; const warnings: string[] = []; console.warn = (m: string) => { warnings.push(m); };
  try { assert.equal((await listAllDocuments(db, "db", "x", [], 10, 2)).length, 20); } finally { console.warn = warn; }
  assert.equal(warnings.length, 1);
});

test("drafts, rejected and private submissions are excluded", async () => {
  const { db } = mockDb({
    editorial: [editorialRow(1), editorialRow(2, {}), { ...editorialRow(3), status: "draft" }, { ...editorialRow(4), status: "candidate" }],
    community: [communityRow(1), { ...communityRow(2), status: "submitted" }, { ...communityRow(3), status: "rejected" }, { ...communityRow(4), status: "changes_requested" }],
  });
  const slugs = (await loadRemoteArticles(db, COLLECTIONS)).map((a) => a.slug).sort();
  assert.deepEqual(slugs, ["community-1", "generated-1", "generated-2"]);
  assert.equal(toEditorialArticle({ ...editorialRow(5), status: "draft" }), null);
  assert.equal(toCommunityArticle({ ...communityRow(5), status: "in_review" }), null);
  assert.equal(mergeArticleSources([mdx({ slug: "d", status: "draft" })], []).length, 0);
});

test("sitemap URL set includes generated and community stories beyond record 100", async () => {
  const { db } = mockDb({ editorial: Array.from({ length: 120 }, (_, i) => editorialRow(i)), community: Array.from({ length: 110 }, (_, i) => communityRow(i)) });
  const urls = mergeArticleSources([mdx({})], await loadRemoteArticles(db, COLLECTIONS)).map((a) => `/${a.category}/${a.slug}`);
  assert.ok(urls.includes("/culture/generated-119"));
  assert.ok(urls.includes("/relationships/community-109"));
  assert.ok(urls.includes("/culture/mdx"));
  const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
  assert.match(sitemap, /getDiscoverableArticles\(\)/);
  for (const file of ["lib/generated-articles.ts", "lib/article-sources.ts"]) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /Query\.limit\(100\)/, file);
});

test("search entries cover MDX, generated and community stories", async () => {
  const { db } = mockDb({ editorial: [editorialRow(1)], community: [communityRow(1)] });
  const index = mergeArticleSources([mdx({ title: "Dry texting explained" })], await loadRemoteArticles(db, COLLECTIONS)).map(toSearchEntry);
  const find = (q: string) => index.filter((e) => `${e.title} ${e.description} ${e.tags.join(" ")} ${e.category}`.toLowerCase().includes(q));
  assert.equal(find("dry texting").length, 1);
  assert.equal(find("generated story").length, 1);
  assert.equal(find("community story").length, 1);
  assert.match(fs.readFileSync("app/search/page.tsx", "utf8"), /getDiscoverableArticles\(\)/);
});

test("legacy article tags normalize safely without mutating source data", () => {
  const valid = ["culture", "internet"];
  const article = mdx({ tags: valid });
  assert.deepEqual(normalizeArticleTags(article.tags), valid);
  assert.deepEqual(normalizeArticleTags("culture"), ["culture"]);
  assert.deepEqual(normalizeArticleTags(undefined), []);
  assert.deepEqual(normalizeArticleTags(null), []);
  assert.deepEqual(normalizeArticleTags([]), []);
  assert.deepEqual(normalizeArticleTags({ tag: "culture" }), []);
  assert.strictEqual(article.tags, valid);

  const malformed = mdx({ slug: "malformed", tags: "culture" as unknown as string[] });
  assert.doesNotThrow(() => rankRelatedArticles(article, [article, malformed], 3));
  assert.deepEqual(toArticleSummary(malformed).tags, ["culture"]);
  assert.deepEqual(toSearchEntry(mdx({ tags: { tag: "culture" } as unknown as string[] })).tags, []);
  assert.deepEqual(countTopics([mdx({ tags: null as unknown as string[] })]), []);
});

test("related stories include Appwrite content and never the article itself", async () => {
  const { db } = mockDb({ editorial: [editorialRow(1, { title: "Situationship texting rules" , tags: ["Texting"], category: "relationships" })], community: [communityRow(1, { title: "My situationship ended over text" })] });
  const remote = await loadRemoteArticles(db, COLLECTIONS);
  const source = mdx({ slug: "what-is-a-situationship", category: "relationships", title: "What is a situationship?", tags: ["Situationships", "Texting"] });
  const pool = mergeArticleSources([source], remote);
  const related = rankRelatedArticles(source, pool, 3);
  assert.ok(related.some((a) => a.source === "editorial"));
  assert.ok(related.some((a) => a.source === "community"));
  assert.ok(!related.some((a) => a.slug === source.slug));
  // Appwrite stories receive recommendations too.
  const community = remote.find((a) => a.source === "community")!;
  const forCommunity = rankRelatedArticles(community, pool, 3);
  assert.ok(forCommunity.length > 0 && !forCommunity.some((a) => a.slug === community.slug));
});

test("related fallback uses recent stories from the same public desk", () => {
  const source = mdx({ slug: "orphan", category: "self-care", title: "Zzzz", tags: [] });
  const pool = [
    source,
    mdx({ slug: "old-rel", category: "relationships", title: "Qqqq", date: "2026-09-21T00:00:00.000Z" }),
    mdx({ slug: "new-rel", category: "relationships", title: "Wwww", date: "2026-09-29T00:00:00.000Z" }),
    mdx({ slug: "culture", category: "culture", title: "Xxxx", date: "2026-09-30T00:00:00.000Z" }),
  ];
  // Same public desk first (newest first), then site-wide to keep three cards.
  assert.deepEqual(rankRelatedArticles(source, pool, 3).map((a) => a.slug), ["new-rel", "old-rel", "culture"]);
});

test("dates are stable across repeated loads and dateModified is never empty", async () => {
  const noDates = editorialRow(9, { publishAt: undefined });
  const community = communityRow(9, { publishedAt: undefined, reviewedAt: "" });
  const first = [toEditorialArticle(noDates)!, toCommunityArticle(community)!];
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = [toEditorialArticle(noDates)!, toCommunityArticle(community)!];
  assert.deepEqual(first.map((a) => a.date), second.map((a) => a.date));
  assert.equal(first[1].date, "2026-09-27T00:00:00.000Z", "falls back to $createdAt, not now");
  for (const article of first) assert.ok(article.updated && !Number.isNaN(new Date(article.updated).getTime()));
  assert.equal(first[1].updated, first[1].date);
  const reviewed = toCommunityArticle(communityRow(10, { reviewedAt: "2026-09-29T00:00:00.000Z" }))!;
  assert.equal(reviewed.updated, "2026-09-29T00:00:00.000Z");
  assert.equal(toEditorialArticle({ ...editorialRow(11), $createdAt: undefined, payload: JSON.stringify({ slug: "x", category: "culture", bodyMarkdown: "x" }) }), null, "no timestamp at all: excluded, not dated now");
});

test("reading time is derived from the body, not hard-coded", () => {
  const short = toEditorialArticle(editorialRow(1, { bodyMarkdown: body(200), readingTime: "5 min read" }))!;
  const long = toCommunityArticle(communityRow(1, { content: JSON.stringify({ blocks: [{ type: "paragraph", text: body(2000) }] }) }))!;
  assert.equal(short.readingTime, "1 min read");
  assert.equal(long.readingTime, formatReadingTime(body(2000)));
  assert.equal(long.readingTime, "10 min read");
});

test("missing cover images use the site fallback and are kept out of metadata", () => {
  const article = toCommunityArticle(communityRow(1), "https://media.example.com")!;
  assert.equal(article.image, FALLBACK_IMAGE);
  assert.notEqual(article.image, "");
  assert.equal(hasIndexableImage(article.image), false);
  const withCover = toCommunityArticle(communityRow(2, { coverObjectKey: "covers/a.jpg" }), "https://media.example.com/")!;
  assert.equal(withCover.image, "https://media.example.com/covers/a.jpg");
  assert.equal(hasIndexableImage(withCover.image), true);
  const editorialNoImage = toEditorialArticle(editorialRow(3, { image: "" }))!;
  assert.equal(editorialNoImage.image, FALLBACK_IMAGE);
  const view = fs.readFileSync("components/article/ArticleView.tsx", "utf8");
  assert.match(view, /hasIndexableImage\(heroImage\)/);
  assert.match(fs.readFileSync("app/[category]/[slug]/page.tsx", "utf8"), /hasIndexableImage\(article\.image\)/);
});

test("community author names are preserved in the normalized model", () => {
  const summary = toArticleSummary(toCommunityArticle(communityRow(1))!);
  assert.equal(summary.author, "Aisha K");
  assert.equal(summary.source, "community");
  assert.equal(summary.status, "published");
});

test("MDX behaviour is preserved: MDX wins duplicate URLs and keeps its order", () => {
  const local = [mdx({ slug: "a", date: "2026-09-30T00:00:00.000Z" }), mdx({ slug: "b", date: "2026-09-22T00:00:00.000Z" })];
  const remote = [mdx({ slug: "a", title: "Remote duplicate", source: "editorial" }), mdx({ slug: "c", source: "community" })];
  const merged = mergeArticleSources(local, remote);
  assert.deepEqual(merged.map((a) => a.slug), ["a", "b", "c"]);
  assert.equal(merged[0].title, "MDX story");
  assert.equal(toArticleSummary(local[0]).source, "mdx");
  assert.equal(formatReadingTime(body(440)), "2 min read");
});
