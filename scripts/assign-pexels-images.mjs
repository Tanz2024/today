#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const key = process.env.PEXELS_API_KEY;
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reviewOnly = args.includes("--review");
const target = args.find((arg) => !arg.startsWith("--"));
const queryOverrides = {
  "campus/how-to-study-without-burning-out": "student studying laptop notes desk",
  "culture/wilted-rose-emoji-meaning": "person texting smartphone close up",
  "money/student-budget-guide": "student budgeting calculator notebook",
  "relationships/what-is-a-situationship": "couple talking cafe",
};

function queryFor(data) {
  return (data.imageConcept || data.imageKeywords?.join(" ") || data.imageAlt || `${data.title || ""} ${data.description || ""}`).replace(/[()[\]{}:,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}
function words(value) { return new Set(String(value).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)); }
async function search(query) {
  const params = new URLSearchParams({ query, orientation: "landscape", per_page: "8" });
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
  if (!response.ok) return [];
  return (await response.json()).photos ?? [];
}
async function main() {
  if (!key) throw new Error("PEXELS_API_KEY is missing. Add it to .env.local.");
  const review = reviewOnly ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/image-review.json"), "utf8")) : [];
  const reviewFiles = review.map((item) => path.join(process.cwd(), "content", `${item.slug}.mdx`)).filter((file) => fs.existsSync(file));
  const files = target ? [target] : reviewOnly ? reviewFiles : args.includes("--all") ? walk(path.join(process.cwd(), "content")).filter((file) => file.endsWith(".mdx")) : [];
  if (!files.length) throw new Error("Usage: npm run images:pexels -- content/path/article.mdx [--dry-run] or --all");
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = matter(raw);
    if (parsed.data.status === "draft") continue;
    const reviewItem = review.find((item) => path.join(process.cwd(), "content", `${item.slug}.mdx`) === file);
    if (reviewOnly && !reviewItem) continue;
    if (!reviewOnly && parsed.data.imageSourceType === "pexels" && parsed.data.needsImageReview !== true) continue;
    const query = queryOverrides[reviewItem?.slug] ?? (reviewItem ? `${reviewItem.recommendedConcept} ${reviewItem.keywords.join(" ")}` : queryFor(parsed.data));
    const photos = await search(query);
    const sourceWords = words(query);
    const ranked = photos.map((photo) => ({ photo, score: [...words(photo.alt || "").values()].filter((word) => sourceWords.has(word)).length })).sort((a, b) => b.score - a.score);
    const selected = ranked[0]?.score > 0 ? ranked[0].photo : undefined;
    console.log(`ARTICLE: ${file}\nSEARCH QUERY: ${query}\nCURRENT IMAGE: ${parsed.data.image || "none"}\nPROPOSED IMAGE: ${selected?.src?.large2x || "none"}\nPHOTOGRAPHER: ${selected?.photographer || "none"}\nPEXELS PAGE: ${selected?.url || "none"}\n`);
    if (!selected || dryRun) continue;
    let frontmatter = parsed.matter;
    const updates = { image: selected.src.large2x || selected.src.large, imageAlt: selected.alt || parsed.data.imageAlt || query, imageCredit: `Photo by ${selected.photographer} on Pexels`, imageCreditUrl: selected.url, imageSourceType: "pexels", needsImageReview: false };
    for (const [field, value] of Object.entries(updates)) {
      const line = `${field}: ${JSON.stringify(value)}`;
      const pattern = new RegExp(`^${field}:.*$`, "m");
      frontmatter = pattern.test(frontmatter) ? frontmatter.replace(pattern, line) : `${frontmatter}\n${line}`;
    }
    fs.writeFileSync(file, `---\n${frontmatter.trim()}\n---\n${parsed.content}`);
  }
}
function walk(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]); }
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
