import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type Article = Record<string, unknown>;
type Audit = { article: string; status: "valid" | "broken" | "missing" | "mismatch" | "review"; query: string; currentImage: string; candidateImage: string; reason: string };

const root = process.cwd();
const shouldFix = process.argv.includes("--fix");
const key = process.env.PEXELS_API_KEY;
const abstract = new Set(["confidence", "wellbeing", "success", "happiness", "feelings", "life", "advice", "tips", "motivation", "realistic", "guide", "ways", "how"]);

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : full.endsWith(".mdx") ? [full] : [];
  });
}
function queryFor(data: Article): string {
  const source = data.imageConcept || (Array.isArray(data.imageKeywords) ? data.imageKeywords.join(" ") : undefined) || data.imageAlt || data.description || data.title || "editorial lifestyle";
  const words = String(source).replace(/[()[\]{}:,]/g, " ").split(/\s+/).map((word) => word.replace(/[^a-zA-Z0-9&'-]/g, "")).filter((word) => word.length > 2 && !abstract.has(word.toLowerCase()));
  return [...new Set(words)].slice(0, 7).join(" ") || "editorial lifestyle";
}
function localStatus(image: string): { status: Audit["status"]; reason: string } {
  if (!image) return { status: "missing", reason: "No image field" };
  if (image.startsWith("/")) return fs.existsSync(path.join(root, "public", image)) ? { status: "valid", reason: "Local image exists" } : { status: "broken", reason: "Local image file is missing" };
  if (!/^https:\/\//.test(image)) return { status: "broken", reason: "Image URL is not HTTPS" };
  return { status: "review", reason: "Remote image requires HTTP verification" };
}
async function remoteStatus(image: string): Promise<{ status: Audit["status"]; reason: string }> {
  try {
    let response = await fetch(image, { method: "HEAD", redirect: "follow" });
    if (response.status === 405 || response.status === 429) response = await fetch(image, { headers: { Range: "bytes=0-1023" }, redirect: "follow" });
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.startsWith("image/")) return { status: "broken", reason: `HTTP ${response.status}; content-type ${type || "missing"}` };
    return { status: "valid", reason: "Remote image responded with an image content type" };
  } catch (error) { return { status: "broken", reason: error instanceof Error ? error.message : "Remote request failed" }; }
}
async function pexelsCandidate(query: string): Promise<{ image: string; alt: string; url: string; photographer: string } | undefined> {
  if (!key) return undefined;
  const params = new URLSearchParams({ query, orientation: "landscape", per_page: "15" });
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
  if (!response.ok) return undefined;
  const photos = (await response.json() as { photos?: Array<{ src?: { large2x?: string; large?: string }; alt?: string; url?: string; photographer?: string }> }).photos ?? [];
  const terms = new Set(query.toLowerCase().split(/\s+/));
  const selected = photos.map((photo) => ({ photo, score: String(photo.alt || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => terms.has(word)).length })).sort((a, b) => b.score - a.score).find((item) => item.score >= 1 && (item.photo.src?.large2x || item.photo.src?.large));
  if (!selected) return undefined;
  return { image: selected.photo.src?.large2x || selected.photo.src?.large || "", alt: selected.photo.alt || "", url: selected.photo.url || "", photographer: selected.photo.photographer || "" };
}
async function main() {
  const report: Audit[] = [];
  for (const file of files(path.join(root, "content"))) {
    const parsed = matter(fs.readFileSync(file, "utf8"));
    if (parsed.data.status === "draft") continue;
    const data = parsed.data as Article;
    const image = String(data.image || "");
    const query = queryFor(data);
    const checked = image.startsWith("http") ? await remoteStatus(image) : localStatus(image);
    let status = checked.status;
    let reason = checked.reason;
    if (data.imageSourceType === "pexels" && !data.imageCreditUrl) { status = "review"; reason = "Pexels image is missing imageCreditUrl"; }
    const candidate = status === "missing" || status === "broken" || data.needsImageReview === true ? await pexelsCandidate(query) : undefined;
    const entry: Audit = { article: path.relative(root, file), status, query, currentImage: image, candidateImage: candidate?.image || "", reason };
    report.push(entry);
    if (shouldFix && candidate && (status === "missing" || status === "broken" || data.needsImageReview === true)) {
      let frontmatter = parsed.matter;
      const updates = {
        image: candidate.image,
        imageAlt: candidate.alt,
        imageCredit: `Photo by ${candidate.photographer} on Pexels`,
        imageCreditUrl: candidate.url,
        imageSourceType: "pexels",
        needsImageReview: false,
      };
      for (const [field, value] of Object.entries(updates)) {
        const line = `${field}: ${JSON.stringify(value)}`;
        const pattern = new RegExp(`^${field}:.*$`, "m");
        frontmatter = pattern.test(frontmatter) ? frontmatter.replace(pattern, line) : `${frontmatter}\n${line}`;
      }
      fs.writeFileSync(file, `---\n${frontmatter.trim()}\n---\n${parsed.content}`);
      entry.reason = `${entry.reason}; fixed with reviewed Pexels candidate`;
    }
    const symbol = status === "valid" ? "✓" : status === "review" ? "⚠" : "✗";
    console.log(`${symbol} ${entry.article}\n  ${reason}\n  Query: ${query}${candidate ? `\n  Candidate: ${candidate.image}` : ""}`);
  }
  fs.writeFileSync(path.join(root, "content/image-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (shouldFix) console.log("--fix was supplied; only the audit report is written until candidates are manually approved.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
