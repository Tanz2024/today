// Regression tests for the TodayAI transformation: unified navigation,
// AI taxonomy, AI tools data integrity, homepage structure, branding,
// legacy-key compatibility, preserved routes and bounded fetching.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PRIMARY_NAV, isNavItemActive, LEGACY_DESK_MENUS } from "../lib/nav.ts";
import { classifyAiTopic, classifyContentType, isAiArticle, AI_TOPICS } from "../lib/ai-taxonomy.ts";
import { AI_TOOLS, AI_TOOL_CATEGORIES } from "../lib/ai-tools.ts";
import { PRACTICAL_TOOLS } from "../lib/practical-tools.ts";
import { boundedFetch, isCircuitOpen, resetBoundedFetchState, UpstreamUnavailableError } from "../lib/bounded-fetch.ts";

const read = (file: string) => fs.readFileSync(file, "utf8");

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ── Navigation ──────────────────────────────────────────────────────
test("primary navigation is News | AI Tools | Reviews | Guides | Topics | Explore", () => {
  assert.deepEqual(PRIMARY_NAV.map((item) => item.label), ["News", "AI Tools", "Reviews", "Guides", "Topics", "Explore"]);
});

test("desktop header and mobile menu both render the shared PRIMARY_NAV", () => {
  for (const file of ["components/layout/Header.tsx", "components/layout/MobileMenuOverlay.tsx"]) {
    const source = read(file);
    assert.match(source, /PRIMARY_NAV\.map\(/, `${file} must render PRIMARY_NAV`);
    assert.doesNotMatch(source, /["']\/(travel|style)["']/, `${file} must not hardcode legacy desks`);
  }
});

test("legacy Travel/Style desks are not primary navigation but keep their routes", () => {
  const hrefs = PRIMARY_NAV.flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);
  assert.ok(!hrefs.includes("/travel") && !hrefs.includes("/style"));
  assert.ok(LEGACY_DESK_MENUS.some((menu) => menu.href === "/travel"));
  assert.ok(fs.existsSync("app/[category]/page.tsx"));
});

test("every primary nav item has a real page", () => {
  for (const item of PRIMARY_NAV) assert.ok(fs.existsSync(`app${item.href}/page.tsx`), item.href);
});

test("active indicator matches section prefixes without false positives", () => {
  const explore = PRIMARY_NAV.find((item) => item.label === "Explore")!;
  const news = PRIMARY_NAV.find((item) => item.label === "News")!;
  assert.equal(isNavItemActive(explore, "/play/obby"), true);
  assert.equal(isNavItemActive(news, "/news/ai-at-work"), true);
  assert.equal(isNavItemActive(news, "/newsletter"), false);
  assert.equal(isNavItemActive(news, null), false);
});

test("header search stays reachable: header is never hidden on scroll", () => {
  const header = read("components/layout/Header.tsx");
  assert.doesNotMatch(header, /-translate-y-full/);
  assert.match(header, /href="\/search"/);
  const css = read("app/editorial.css");
  assert.match(css, /\.site-header \{[^}]*position: sticky/);
});

test("mobile menu has search, focus trap, Escape close and safe-area padding", () => {
  const menu = read("components/layout/MobileMenuOverlay.tsx");
  assert.match(menu, /role="search"/);
  assert.match(menu, /aria-modal="true"/);
  assert.match(menu, /event\.key === "Escape"/);
  assert.match(menu, /event\.key !== "Tab"/);
  assert.match(read("app/editorial.css"), /\.mobile-menu-body \{[^}]*safe-area-inset-bottom/);
  // Focus returns to the trigger and the menu closes on route change.
  const header = read("components/layout/Header.tsx");
  assert.match(header, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(header, /pathname !== lastPath/);
});

// ── Taxonomy ────────────────────────────────────────────────────────
test("AI classification uses tags, not loose keywords", () => {
  assert.equal(isAiArticle({ title: "The Phone Is No Longer the Main Character", tags: ["Digital Life", "Social Media"] }), false);
  assert.equal(isAiArticle({ title: "Best digital tools for technology fans", tags: ["Technology"] }), false);
  assert.equal(isAiArticle({ title: "Anything", tags: ["AI Tools"] }), true);
});

test("topic rules are deterministic and fall back to Everyday AI", () => {
  assert.equal(classifyAiTopic({ title: "Can Teachers Detect ChatGPT?", tags: ["AI Tools", "University", "Academic Integrity", "ChatGPT"] }), "ai-education");
  assert.equal(classifyAiTopic({ title: "How to Tell If a Photo Is AI-Generated", tags: ["AI", "Online Safety"] }), "ai-safety-policy");
  assert.equal(classifyAiTopic({ title: "AI Is Coming for Your Job", tags: ["AI", "Future of Work", "Careers"] }), "ai-at-work");
  assert.equal(classifyAiTopic({ title: "AI Is Becoming the Thing You Open", tags: ["AI", "Technology"] }), "everyday-ai");
  assert.equal(classifyAiTopic({ title: "Unrelated", tags: ["Travel"] }), null);
});

test("explicit frontmatter overrides win; reviews are never inferred", () => {
  assert.equal(classifyAiTopic({ title: "x", tags: [], aiTopic: "robotics" }), "robotics");
  assert.equal(classifyAiTopic({ title: "x", tags: ["AI"], aiTopic: "not-a-topic" }), "everyday-ai");
  assert.equal(classifyContentType({ title: "ChatGPT review: is it worth it?" }), "explainer");
  assert.equal(classifyContentType({ title: "Claude vs Gemini" }), "news");
  assert.equal(classifyContentType({ title: "x", contentType: "review" }), "review");
  assert.equal(classifyContentType({ title: "How to use AI" }), "guide");
});

test("every AI article in content/ classifies into a known topic", () => {
  const slugs = new Set(AI_TOPICS.map((topic) => topic.slug));
  let aiCount = 0;
  for (const dir of fs.readdirSync("content", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const file of fs.readdirSync(path.join("content", dir.name)).filter((name) => name.endsWith(".mdx"))) {
      const raw = read(path.join("content", dir.name, file));
      const title = raw.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
      const tags = JSON.parse(raw.match(/^tags:\s*(\[.*\])\s*$/m)?.[1] ?? "[]") as string[];
      const topic = classifyAiTopic({ title, tags });
      if (topic) { aiCount += 1; assert.ok(slugs.has(topic)); }
    }
  }
  assert.ok(aiCount >= 5, `expected the existing AI articles to classify, got ${aiCount}`);
});

// ── AI tools vs practical tools ─────────────────────────────────────
test("AI tools directory data is factual and well-formed", () => {
  const categories = new Set(AI_TOOL_CATEGORIES.map((category) => category.slug));
  const slugs = new Set<string>();
  for (const tool of AI_TOOLS) {
    assert.ok(!slugs.has(tool.slug), `duplicate ${tool.slug}`); slugs.add(tool.slug);
    assert.ok(categories.has(tool.category), tool.slug);
    assert.match(tool.url, /^https:\/\//);
    assert.match(tool.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    if (tool.pricing !== null) assert.ok(tool.pricingVerifiedOn, `${tool.slug} pricing needs pricingVerifiedOn`);
    for (const href of tool.relatedArticles ?? []) {
      const [, category, slug] = href.split("/");
      assert.ok(fs.existsSync(`content/${category}/${slug}.mdx`), `${tool.slug} links to missing ${href}`);
    }
    assert.doesNotMatch(JSON.stringify(tool), /"(rating|score|stars)"/i);
  }
});

test("all practical calculators are preserved and separate from AI tools", () => {
  const expected = ["attendance-calculator", "bill-splitter", "cgpa-calculator", "compatibility-check", "date-calculator", "focus-timer", "percentage-calculator", "student-budget-calculator", "trip-budget-calculator", "word-counter"];
  for (const slug of expected) {
    assert.ok(fs.existsSync(`app/tools/${slug}/page.tsx`), slug);
    assert.ok(PRACTICAL_TOOLS.some((tool) => tool.href === `/tools/${slug}`), `${slug} listed`);
  }
  assert.doesNotMatch(read("app/tools/page.tsx"), /AI tools for real life/);
});

// ── Homepage ────────────────────────────────────────────────────────
test("homepage is AI-first and section order is stable", () => {
  const page = read("app/page.tsx");
  const order = ["featured-heading", "latest-heading", "trending-heading", "tools-heading", "reviews-heading", "guides-heading", "explore-heading", "NewsletterSignup variant=\"homepage\""];
  let last = -1;
  for (const marker of order) {
    const index = page.indexOf(marker);
    assert.ok(index > last, `${marker} out of order or missing`);
    last = index;
  }
  for (const legacy of ["MetroPicks", "TravelFeature", "WorthReadingAfterTravel", "InterestSelector", "EditorialFeature"]) {
    assert.doesNotMatch(page, new RegExp(legacy), `${legacy} should not be on the AI homepage`);
  }
  assert.match(page, /selectAiArticles/);
  assert.doesNotMatch(page, /technology\|tool\|chatgpt/, "old keyword regex removed");
});

// ── Branding & compatibility ────────────────────────────────────────
test("no visible BrisaStory branding remains in UI source", () => {
  const offenders: string[] = [];
  for (const file of [...walk("app"), ...walk("components")]) {
    read(file).split("\n").forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
      if (/user-agent/i.test(line)) return;
      const visible = line.replace(/brisastory\.live|brisastory[:_][\w:-]*|\/BrisaStory\.jpg/gi, "");
      if (/BrisaStory|Brisa (Obby|Rush|Breaker|Quick Draw)/.test(visible)) offenders.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test("legacy storage keys and production domain are preserved", () => {
  const all = [...walk("app"), ...walk("components"), ...walk("lib")].map(read).join("\n");
  for (const key of ["brisastory:saved:", "brisastory_consent", "brisastory:recently-read", "brisastory:read-recorded"]) {
    assert.ok(all.includes(key), `${key} must keep working for returning readers`);
  }
  assert.match(read("lib/seo.ts"), /SITE_URL = "https:\/\/brisastory\.live"/);
});

// ── Preserved routes ────────────────────────────────────────────────
test("games and community features keep their routes", () => {
  for (const route of ["play", "play/trivia", "play/obby", "play/rush", "play/breaker", "play/group-chat", "play/red-flag-green-flag", "play/would-you-rather", "play/weekend-picker", "play/quick-draw", "play/stay-out", "questions", "community", "saved", "daily-drop", "pulse", "search", "topics", "trending", "gaming", "metro", "music"]) {
    assert.ok(fs.existsSync(`app/${route}/page.tsx`), `/${route}`);
  }
});

// ── Bounded fetch ───────────────────────────────────────────────────
test("boundedFetch times out a hanging upstream and opens the circuit", async () => {
  resetBoundedFetchState();
  const original = globalThis.fetch;
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  })) as typeof fetch;
  const warn = console.warn; console.warn = () => {};
  try {
    const started = Date.now();
    await assert.rejects(boundedFetch("https://example.test", { provider: "Test", timeoutMs: 30 }), UpstreamUnavailableError);
    assert.ok(Date.now() - started < 1000);
    await assert.rejects(boundedFetch("https://example.test", { provider: "Test", timeoutMs: 30 }), UpstreamUnavailableError);
    assert.equal(isCircuitOpen("Test"), true);
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response("ok"); }) as typeof fetch;
    await assert.rejects(boundedFetch("https://example.test", { provider: "Test" }), /circuit open/);
    assert.equal(called, false, "open circuit skips the network");
  } finally {
    globalThis.fetch = original; console.warn = warn; resetBoundedFetchState();
  }
});

test("boundedFetch passes through successful responses", async () => {
  resetBoundedFetchState();
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  try {
    const response = await boundedFetch("https://example.test", { provider: "Ok" });
    assert.equal(response.status, 200);
    assert.equal(isCircuitOpen("Ok"), false);
  } finally { globalThis.fetch = original; }
});
