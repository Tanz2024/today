import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import nextConfig from "../next.config.ts";
import { questionIndexing, QUESTION_GUIDANCE, QUESTION_STRONGER_ARTICLE } from "../lib/question-indexing.ts";
import { showFooterNewsletter } from "../lib/newsletter-placement.ts";
import { adBoundary, bodyLayout, readNextBoundary } from "../lib/article-body.ts";
import { formatReadingTime } from "../lib/reading-time.ts";
import { buildMetadata } from "../lib/seo.ts";
import questions from "../content/questions.json" with { type: "json" };

const read = (file: string) => fs.readFileSync(file, "utf8");
const sitemap = read("app/sitemap.ts");
const staticRoutes = [...sitemap.slice(sitemap.indexOf("STATIC_ROUTES = ["), sitemap.indexOf("];")).matchAll(/"([^"]*)"/g)].map((m) => m[1] || "/");

// Routes that are deliberately noindex (utility, personal, ephemeral or thin).
const NOINDEX_ROUTES: Record<string, string> = {
  "/saved": "app/saved/page.tsx",
  "/search": "app/search/page.tsx",
  "/daily-drop": "app/daily-drop/page.tsx",
  "/pulse": "app/pulse/page.tsx",
  "/community": "app/community/page.tsx",
  "/community/status": "app/community/status/layout.tsx",
  "/story-review-7q4m9x": "app/story-review-7q4m9x/page.tsx",
  "/admin/curation": "app/admin/curation/page.tsx",
};

test("utility and ephemeral pages are noindex and absent from the sitemap", () => {
  for (const [route, file] of Object.entries(NOINDEX_ROUTES)) {
    assert.match(read(file), /noindex: true/, file);
    assert.ok(!staticRoutes.includes(route), `${route} in sitemap`);
  }
  assert.match(read("app/metro/page.tsx"), /noindex: getMetroPicks\(DEFAULT_CITY, 1\)\.length === 0/);
  assert.ok(!staticRoutes.includes("/metro"));
});

test("noindex utility pages do not carry a canonical, and nothing inherits the homepage one", () => {
  const meta = buildMetadata({ title: "Saved", description: "d", path: "/saved", noindex: true });
  assert.equal(meta.alternates?.canonical, undefined);
  assert.doesNotMatch(read("app/layout.tsx"), /canonical:/);
  // The old search metadata spread a self-canonical under a noindex override.
  assert.doesNotMatch(read("app/search/page.tsx"), /robots: \{ index: false/);
});

test("the sitemap lists no redirecting URLs", async () => {
  const redirects = ((await nextConfig.redirects?.()) ?? []).map((rule) => rule.source);
  const runtimeRedirects = ["/music", "/community/write"];
  for (const route of staticRoutes) {
    assert.ok(!redirects.includes(route), `${route} is a redirect source`);
    assert.ok(!runtimeRedirects.includes(route), `${route} redirects at runtime`);
  }
  assert.equal(new Set(staticRoutes).size, staticRoutes.length, "no duplicate static routes");
});

test("question pages: canonical, robots and sitemap agree", () => {
  assert.match(sitemap, /getQuestions\(\)\.filter\(\(item\) => questionIndexing\(item\.slug\)\.index\)/);
  const decisions = Object.fromEntries(questions.map((q: { slug: string }) => [q.slug, questionIndexing(q.slug)]));
  assert.equal(decisions["what-does-dry-texting-mean"], undefined, "stale question slug is not in the current question catalog");
  for (const slug of Object.keys(decisions)) assert.deepEqual(decisions[slug], { index: false, reason: "generic-guidance" });
  // Indexable means it has its own guidance; covered questions point to a real article file.
  for (const [slug, decision] of Object.entries(decisions)) if (decision.index) assert.ok(QUESTION_GUIDANCE[slug]);
  for (const target of Object.values(QUESTION_STRONGER_ARTICLE)) assert.ok(fs.existsSync(`content/${target.category}/${target.slug}.mdx`));
  const page = read("app/questions/[slug]/page.tsx");
  assert.match(page, /noindex: !indexing\.index/);
  assert.match(page, /canonical: `\$\{getSiteUrl\(\)\}\//);
  assert.doesNotMatch(page, /https:\/\/brisastory\.live/);
  assert.doesNotMatch(page, /"dry-texting"/);
});

test("game detail pages are noindex and not in the sitemap", () => {
  assert.match(read("app/play/what-to-play/[slug]/page.tsx"), /path: `\/play\/what-to-play\/\$\{game\.slug\}`, noindex: true/);
  assert.doesNotMatch(sitemap, /what-to-play\//);
  assert.ok(staticRoutes.includes("/play/what-to-play"), "the What to Play hub stays indexable");
});

test("article newsletter follows the body, before secondary interactions", () => {
  const view = read("components/article/ArticleView.tsx");
  const at = (needle: string) => { const index = view.indexOf(needle); assert.ok(index > 0, needle); return index; };
  const newsletter = at('<NewsletterSignup variant="article"');
  assert.ok(at('id="article-body-end"') < newsletter);
  for (const later of ["<ReadTimeTracker", "<QuickReactionBar", "<PulsePoll", "<ShareButtons", "<AuthorInfo", "<RelatedArticles articles={related} category"]) {
    assert.ok(newsletter < at(later), `newsletter before ${later}`);
  }
  assert.match(view, /deskName=\{newsletterDesk\}/);
  assert.match(read("components/newsletter/NewsletterSignup.tsx"), /New \$\{deskName\} stories and the best of TodayAI, once a week\./);
});

test("footer newsletter shows only where no other signup exists", () => {
  assert.equal(showFooterNewsletter("/"), false);
  assert.equal(showFooterNewsletter("/culture/some-story"), false);
  assert.equal(showFooterNewsletter("/self-care/some-story"), false, "hidden-desk article URLs too");
  assert.equal(showFooterNewsletter("/community/write"), false);
  for (const route of ["/culture", "/topics", "/topics/gen-alpha", "/about", "/play/trivia", "/questions/should-i-double-text"]) {
    assert.equal(showFooterNewsletter(route), true, route);
  }
  // One responsive footer signup, rendered only when showFooterNewsletter() allows it.
  const footer = read("components/layout/Footer.tsx");
  assert.equal((footer.match(/<NewsletterSignup variant="footer" \/>/g) ?? []).length, 1);
  assert.match(footer, /showNewsletter \? \(/);
  assert.ok(!fs.existsSync("app/newsletter"), "no thin standalone signup page");
});

test("robots.txt: one rule group, crawlable noindex pages, correct sitemap", () => {
  const robots = read("app/robots.ts");
  assert.equal((robots.match(/userAgent:/g) ?? []).length, 1);
  assert.match(robots, /userAgent: "\*", allow: "\/", disallow: \["\/api\/", "\/admin\/"\]/);
  assert.match(robots, /sitemap: `\$\{getSiteUrl\(\)\}\/sitemap\.xml`/);
  for (const route of ["/saved", "/search", "/pulse", "/story-review"]) assert.ok(!robots.includes(`"${route}`), route);
});

test("on every real MDX article, read-next and the midpoint ad never share a boundary", () => {
  let withReadNext = 0;
  for (const dir of fs.readdirSync("content")) {
    if (!fs.statSync(path.join("content", dir)).isDirectory()) continue;
    for (const file of fs.readdirSync(path.join("content", dir)).filter((name) => name.endsWith(".mdx"))) {
      const { content, data } = matter(read(path.join("content", dir, file)));
      if (data.status === "draft") continue;
      const minutes = Number.parseInt(formatReadingTime(content), 10);
      const readNext = readNextBoundary(content, minutes);
      if (readNext === null) continue;
      withReadNext += 1;
      const ad = adBoundary(content, bodyLayout(minutes));
      const sections = content.split(/\n(?=##\s)/).length;
      assert.notEqual(readNext, ad, file);
      assert.ok(readNext >= 2 && readNext / sections >= 0.35 && readNext / sections <= 0.5, file);
    }
  }
  assert.ok(withReadNext > 0);
});

test("SEO metadata does not hard-code the site origin", () => {
  for (const file of ["components/play/PlaySeo.tsx", "app/questions/[slug]/page.tsx"]) assert.doesNotMatch(read(file), /https:\/\/brisastory\.live/, file);
  assert.match(read("app/[category]/page.tsx"), /hasIndexableImage\(image\)/);
});

test("visible description, meta description and schema share one source", () => {
  assert.match(read("app/[category]/[slug]/page.tsx"), /article\.seoDescription \?\? displayArticleDescription\(article\)/);
  const view = read("components/article/ArticleView.tsx");
  assert.match(view, /articleJsonLd\(\{ \.\.\.article, description: displayArticleDescription\(article\) \}/);
  assert.match(view, /\{displayArticleDescription\(article\)\}/);
});
