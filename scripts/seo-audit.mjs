// Development-only SEO spot check against a running BrisaStory server.
//   npm run seo:audit -- http://localhost:3000            representative routes
//   npm run seo:audit -- http://localhost:3000 --sitemap  every sitemap URL
// Checks status, canonical, robots, title, description, JSON-LD and the RSS
// alternate, and flags pages that inherit the homepage canonical. Not a
// crawler and not used by the app.
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const sitemapMode = process.argv.includes("--sitemap");
const SITE = "https://brisastory.live";

const ROUTES = ["/", "/culture", "/topics", "/questions", "/trending", "/saved", "/search", "/pulse", "/daily-drop", "/play", "/feed.xml", "/robots.txt"];

const pick = (html, pattern) => html.match(pattern)?.[1];

async function inspect(path) {
  const response = await fetch(base + path, { redirect: "manual" });
  const type = response.headers.get("content-type") ?? "";
  const result = { path, status: response.status, problems: [] };
  if (!type.includes("text/html")) return { ...result, type };
  const html = await response.text();
  result.canonical = pick(html, /<link rel="canonical" href="([^"]*)"/);
  result.robots = pick(html, /<meta name="robots" content="([^"]*)"/);
  result.title = pick(html, /<title>([^<]*)<\/title>/);
  result.description = pick(html, /<meta name="description" content="([^"]*)"/);
  result.jsonLd = (html.match(/<script type="application\/ld\+json">/g) ?? []).length;
  result.rss = /<link rel="alternate" type="application\/rss\+xml"/.test(html);
  const noindex = /noindex/.test(result.robots ?? "");
  if (!result.title) result.problems.push("no title");
  if (!result.description) result.problems.push("no description");
  if (!result.rss) result.problems.push("no RSS alternate");
  if (!result.jsonLd) result.problems.push("no JSON-LD");
  if (path !== "/" && (result.canonical === SITE || result.canonical === `${SITE}/`)) result.problems.push("inherits homepage canonical");
  if (!noindex && !result.canonical) result.problems.push("indexable without canonical");
  return result;
}

async function sitemapUrls() {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(SITE, "") || "/");
}

const paths = sitemapMode ? await sitemapUrls() : ROUTES;
let failures = 0;
const seen = new Set();
for (const path of paths) {
  const result = await inspect(path);
  if (sitemapMode) {
    if (seen.has(path)) result.problems.push("duplicate sitemap URL");
    seen.add(path);
    if (result.status !== 200) result.problems.push(`status ${result.status} in sitemap`);
    if (/noindex/.test(result.robots ?? "")) result.problems.push("noindex URL in sitemap");
    const expected = path === "/" ? SITE : `${SITE}${path}`;
    if (result.canonical && result.canonical !== expected) result.problems.push(`canonical ${result.canonical}`);
  }
  if (result.problems.length) failures += 1;
  if (!sitemapMode || result.problems.length) {
    console.log(`${result.problems.length ? "✗" : "✓"} ${result.status} ${path}${result.robots ? `  [${result.robots}]` : ""}${result.problems.length ? `  — ${result.problems.join(", ")}` : ""}`);
  }
}
console.log(`\n${paths.length} checked, ${failures} with problems`);
process.exitCode = failures ? 1 : 0;
