import { Client, Databases, ID, Query } from "node-appwrite";
import fs from "node:fs";
import path from "node:path";
import { collectSoutheastAsiaTrends } from "./editorial-daily-ai.mjs";
import { similarity } from "./daily-trend-pack.mjs";
import { cronFetch } from "./cron-fetch.mjs";

// These are the route-backed desks. Legacy/editorial aliases are accepted at
// the boundary so old queued candidates do not fail, then normalized before
// an article is stored or linked.
const CATEGORIES = ["culture", "relationships", "campus", "travel", "style", "money", "sex-health"];
export const ARTICLE_TYPES = ["trend", "explainer", "guide", "slang_definition", "relationship_advice", "personal_story", "reported_story", "travel_story", "entertainment", "review_or_list"];
const ARTICLE_TYPE_RANGES = {
  slang_definition: [400, 800], trend: [700, 1200], explainer: [700, 1200], guide: [900, 1600],
  relationship_advice: [700, 1400], personal_story: [800, 1600], reported_story: [1200, 2200],
  travel_story: [800, 1600], entertainment: [600, 1200], review_or_list: [700, 1400],
};
const CATEGORY_ALIASES = {
  meaning: "culture", social: "culture", entertainment: "culture", gaming: "culture",
  technology: "campus", food: "travel", "self-care": "relationships",
};
export function normalizeEditorialCategory(value) {
  const category = String(value ?? "").trim().toLowerCase();
  return CATEGORY_ALIASES[category] ?? category;
}
const CATEGORY_RULES = {
  style: [/skincare|sunscreen|fragrance|beauty|outfit|fashion|grooming/], money: [/budget|saving|salary|career|work|money|paycheck/],
  campus: [/university|student|campus|study|exam|school|ai tool/], relationships: [/dating|texting|friendship|relationship|situationship|lonely/],
  travel: [/food|restaurant|cafe|travel|trip|destination|kuala lumpur|malaysia|hotel|flight/],
  "sex-health": [/consent|contraception|sti|sexual health|body safety|pregnan/],
  culture: [/podcast|music|movie|show|internet|tiktok|youtube|creator|advertis|media|trend|viral|gaming|roblox/],
};
export function classifyEditorialCategory(candidate = {}) {
  const text = normalize(`${candidate.title ?? ""} ${candidate.summary ?? ""} ${candidate.topic ?? ""} ${(candidate.tags ?? []).join(" ")} ${candidate.articleType ?? ""}`);
  const scores = Object.fromEntries(Object.entries(CATEGORY_RULES).map(([category, rules]) => [category, rules.reduce((score, rule) => score + (rule.test(text) ? 1 : 0), 0)]));
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [category, score] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  const confidence = score === 0 ? 0.35 : Math.min(0.98, 0.55 + (score - runnerUp) * 0.12 + Math.min(score, 3) * 0.08);
  return { category, categoryConfidence: Number(confidence.toFixed(2)), categoryReason: score ? `Primary subject matches ${category} signals` : "No strong desk signal; culture is the safe fallback", scores };
}
export function inferEditorialCategory(candidate) { return classifyEditorialCategory(candidate).category; }

export function normalizeArticleType(value, candidate = {}) {
  const type = String(value ?? "").trim().toLowerCase();
  if (ARTICLE_TYPES.includes(type)) return type;
  const text = normalize(`${candidate.title ?? ""} ${candidate.summary ?? ""} ${candidate.topic ?? ""}`);
  if (/what does|meaning|slang|phrase|term/.test(text)) return "slang_definition";
  if (/how to|guide|tips|ways to/.test(text)) return "guide";
  if (/review|best|top|list|rank/.test(text)) return "review_or_list";
  if (/story|diary|my experience/.test(text)) return "personal_story";
  if (/reported|according|study|data|surpasses|investigation/.test(text)) return "reported_story";
  if (/trend|viral|everywhere|suddenly/.test(text)) return "trend";
  return "explainer";
}

const TAG_ALIASES = { "internet culture": "Internet Culture", culture: "Internet Culture", people: "Social Life", podcasts: "Podcasts", podcast: "Podcasts", "gen z": "Gen Z", "gen alpha": "Gen Alpha", media: "Media", advertising: "Advertising", "creator culture": "Creator Culture" };
const BROAD_TAGS = new Set(["life", "people", "culture", "trend", "general", "misc", "other"]);
export function normalizeArticleTags(tags = []) {
  const result = [];
  for (const raw of Array.isArray(tags) ? tags : []) {
    const key = normalize(raw);
    if (!key || BROAD_TAGS.has(key)) continue;
    const value = TAG_ALIASES[key] ?? String(raw).trim().replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    if (!result.some((tag) => normalize(tag) === normalize(value))) result.push(value);
  }
  return result.slice(0, 6);
}
const REVIEW_WORDS = /\b(politic|election|war|murder|suicide|self[- ]harm|diagnos|prescription|lawsuit|defamation|criminal|legal advice|investment advice)\b/i;
const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (value) => normalize(value).replace(/\s+/g, "-").slice(0, 80).replace(/-+$/g, "");
const BRISASTORY_WRITING_BRIEF = `Write for readers aged roughly 15-24 in a natural Gen Z / older Gen Alpha internet-editorial voice. Sound like a smart young person explaining something interesting: conversational, direct, culturally aware, slightly playful and honest. Do not sound corporate, childish, overly formal or like an adult performing slang. Never force Gen Z slang. Open with an observation, question, contradiction or relatable scene—not a definition unless the articleType is slang_definition. Use short 1-3 sentence paragraphs, varied rhythm, useful headings and easy scanning. Connect facts to real behavior and explain why the reader should care. Use online-culture references only when genuinely relevant. Avoid formulaic AI transitions, essay-style introductions, repeating the headline, constant rhetorical questions, excessive em dashes, summary-article-summary duplication, and generic conclusions. Vary structure by reader intent: news/reported_story must separate what happened, evidence, context and uncertainty; personal_story must begin inside a specific supplied scene, then experience and reflection; guide must give concrete steps, prices, dates or locations when relevant; review_or_list must state what was assessed, findings and limitations; fiction must be clearly labeled and never presented as reporting. Do not force Quick Read or a contents list. Only include a quickRead for practical explainers and guides when it adds value. Keep navigation headings to the genuinely useful sections, normally no more than eight. Never invent facts, statistics, quotes, trends, reader numbers, personal experiences or personal-story details. Link a source immediately after any material claim and include the source date and geographic scope when reporting statistics. End with a strong observation, cultural implication or one natural reader question.`;
const TOPIC_STOP_WORDS = new Set("a an and are as brands for gen how it its means of over should the them to what why with z reach".split(" "));
function topicTokens(value) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 3 && !TOPIC_STOP_WORDS.has(token)));
}
function sameUnderlyingTopic(left, right) {
  const a = topicTokens(left);
  const b = topicTokens(right);
  const shared = [...a].filter((token) => b.has(token));
  return shared.length >= 2 && shared.length / Math.min(a.size || 1, b.size || 1) >= 0.45;
}
const BRISAStory_WRITING_BRIEF = BRISASTORY_WRITING_BRIEF;
const HEADLINE_FORMULA_PATTERNS = [
  /\bwhat it means for\b/i,
  /\beverything you need to know about\b/i,
  /\bhere(?:'|’)s why\b/i,
  /\bwhat you should know about\b/i,
  /\bthe ultimate guide to\b/i,
  /\bwhat this means for you\b/i,
];

export function validateHeadlineQuality({ title = "", displayTitle = "" } = {}) {
  const fullTitle = String(title).trim();
  const cardTitle = String(displayTitle).trim();
  const errors = [];
  if (!cardTitle) errors.push("displayTitle is required");
  if (fullTitle.length > 90) errors.push("title is too long");
  if (cardTitle.length > 65) errors.push("displayTitle is too long");
  if (/\.\.\.|…/.test(cardTitle)) errors.push("displayTitle must not contain ellipsis");
  if (HEADLINE_FORMULA_PATTERNS.some((pattern) => pattern.test(fullTitle) || pattern.test(cardTitle))) errors.push("headline uses a generic AI formula");
  if (fullTitle.length > 65 && normalize(fullTitle) === normalize(cardTitle)) errors.push("displayTitle must be shorter than a long title");
  if ((cardTitle.match(/[!?;:]/g) ?? []).length > 2) errors.push("displayTitle has excessive punctuation");
  return { valid: errors.length === 0, errors, titleLength: fullTitle.length, displayTitleLength: cardTitle.length };
}

export function repairDisplayTitle(title, displayTitle) {
  const source = String(displayTitle || title || "").trim();
  const candidates = [
    source.replace(/\s*[:—-]\s*(?:what it means for|everything you need to know about|what you should know about|here(?:'|’)s why).*$/i, "").trim(),
    String(title || "").trim(),
  ];
  return candidates.find((candidate) => candidate && candidate.length <= 65 && candidate.split(/\s+/).length >= 3 && !/\.\.\.|…/.test(candidate) && !HEADLINE_FORMULA_PATTERNS.some((pattern) => pattern.test(candidate))) || null;
}

export function validateGeneratedArticle(article, research = {}) {
  const errors = [];
  if (!article || typeof article !== "object") return { valid: false, errors: ["article must be an object"] };
  for (const field of ["title", "displayTitle", "description", "category", "bodyMarkdown", "seoTitle", "seoDescription"]) if (!String(article[field] ?? "").trim()) errors.push(`${field} is required`);
  const articleType = String(article.articleType ?? "").trim().toLowerCase();
  if (!ARTICLE_TYPES.includes(articleType)) errors.push("unsupported articleType");
  const wordCount = String(article.bodyMarkdown ?? "").trim().split(/\s+/).filter(Boolean).length;
  const [minimum, maximum] = ARTICLE_TYPE_RANGES[articleType] ?? [700, 1400];
  if (wordCount < minimum || wordCount > maximum) errors.push(`word count ${wordCount} is outside ${articleType} range ${minimum}-${maximum}`);
  if (!CATEGORIES.includes(normalizeEditorialCategory(article.category))) errors.push("unsupported category");
  if (Number(article.categoryConfidence ?? 0) < 0.55) errors.push("category confidence is too low");
  errors.push(...validateHeadlineQuality(article).errors);
  const tags = normalizeArticleTags(article.tags);
  if (tags.length < 2) errors.push("at least two meaningful tags are required");
  if (tags.length !== (article.tags ?? []).length) errors.push("tags must be normalized and meaningful");
  if (!research.valid || !research.sources || research.sources.length < 3) errors.push("valid research with at least three sources is required");
  if (articleType === "personal_story" && !research.originalMaterial) errors.push("personal_story requires supplied original material");
  if (article.contextualPoll) {
    const options = article.contextualPoll.options;
    if (!article.contextualPoll.question || !Array.isArray(options) || options.length < 2 || options.length > 4 || new Set(options.map(normalize)).size !== options.length) errors.push("contextualPoll must have a question and 2-4 unique options");
  }
  const text = `${article.title} ${article.description} ${article.bodyMarkdown}`;
  if (REVIEW_WORDS.test(text)) errors.push("topic requires editorial review");
  const claims = validateArticleClaims(article, research);
  errors.push(...claims.errors);
  return { valid: errors.length === 0, errors, needsReview: Boolean(REVIEW_WORDS.test(text) || claims.errors.length), articleType, wordCount, normalizedTags: tags, claimValidation: claims };
}

export function buildResearchPacket(candidate, sources = []) {
  const normalizedSources = sources.slice(0, 5).map((source) => ({ title: source.title, url: source.url, publisher: source.source ?? source.publisher, publishedAt: source.publishedAt ?? "", excerpt: String(source.content ?? source.snippet ?? source.description ?? "").slice(0, 1200) })).filter((source) => source.url);
  const joined = normalizedSources.map((source) => source.excerpt).join(" ");
  const statistics = [...joined.matchAll(/\b\d+(?:\.\d+)?%\b/g)].map((match) => ({ value: match[0], sourceUrl: normalizedSources.find((source) => source.excerpt.includes(match[0]))?.url })).filter((item) => item.sourceUrl);
  const dates = [...joined.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => ({ value: match[0], sourceUrl: normalizedSources.find((source) => source.excerpt.includes(match[0]))?.url })).filter((item) => item.sourceUrl);
  return {
    topic: candidate.title ?? candidate.topic ?? "",
    angle: candidate.summary ?? candidate.description ?? "",
    whyNow: candidate.summary ?? "",
    targetReader: "BrisaStory readers interested in current youth culture and useful context",
    searchIntent: candidate.title ?? "",
    commercialIntent: "",
    confirmedFacts: normalizedSources.filter((source) => source.excerpt).map((source) => ({ fact: source.excerpt, sourceUrl: source.url })), dates, statistics, peopleOrBrands: [], quotes: [], claimsToAvoid: [], disputedClaims: [], regionalContext: [], originalMaterial: candidate.originalMaterial ?? null,
    sources: normalizedSources, valid: normalizedSources.length >= 3 && normalizedSources.every((source) => source.excerpt), status: normalizedSources.length >= 3 ? "ready" : "insufficient",
  };
}

export function validateArticleClaims(article, research = {}) {
  const text = String(article?.bodyMarkdown ?? "");
  const errors = [];
  const sourceText = JSON.stringify(research);
  for (const statistic of text.match(/\b\d+(?:\.\d+)?%/g) ?? []) if (!sourceText.includes(statistic)) errors.push(`unsupported statistic: ${statistic}`);
  for (const year of text.match(/\b(?:19|20)\d{2}\b/g) ?? []) if (!sourceText.includes(year)) errors.push(`unsupported date: ${year}`);
  if (/(?:"[^"\n]{8,}"|“[^”\n]{8,}”)/.test(text) && !(research.quotes ?? []).length) errors.push("unsupported quote");
  if (article.articleType === "personal_story" && !research.originalMaterial) errors.push("personal story contains unsupplied personal material");
  return { valid: errors.length === 0, errors };
}

export function detectStructuralRepetition(article, recentArticles = []) {
  const headings = (String(article?.bodyMarkdown ?? "").match(/^#{2,3}\s+.+$/gm) ?? []).map((heading) => normalize(heading.replace(/^#+\s+/, "")));
  if (headings.length < 2) return { repeated: false, similarity: 0 };
  const signature = headings.join("|");
  let highest = 0;
  for (const recent of recentArticles) {
    const other = (String(recent?.bodyMarkdown ?? "").match(/^#{2,3}\s+.+$/gm) ?? []).map((heading) => normalize(heading.replace(/^#+\s+/, "")));
    if (!other.length) continue;
    const shared = headings.filter((heading) => other.includes(heading)).length;
    highest = Math.max(highest, shared / Math.max(headings.length, other.length));
  }
  return { repeated: highest >= 0.8, similarity: Number(highest.toFixed(2)), signature };
}

async function json(url, options) {
  const response = await cronFetch(url, options, 12_000);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function parseModelJson(content) {
  const raw = String(content ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = raw.slice(start, end + 1)
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(candidate); } catch {}
  }
  throw new Error("OpenRouter returned invalid JSON");
}

export async function researchCandidate(candidate) {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return buildResearchPacket(candidate, candidate.sources ?? []);
  const data = await json("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: key, query: `${candidate.title} ${candidate.summary ?? ""}`, topic: "news", search_depth: "basic", max_results: 5, include_answer: false }) });
  return buildResearchPacket(candidate, data.results ?? []);
}

export async function generateArticle({ candidate, research }) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  const classification = classifyEditorialCategory(candidate);
  const prompt = `${BRISAStory_WRITING_BRIEF}\n\nHeadline rules: return both a full editorial title and a separate displayTitle. title is the complete article headline for the article page and SEO, maximum 90 characters. displayTitle is the shorter card/mobile headline, ideally 35-55 characters and never over 65 characters. Make displayTitle a complete, natural phrase that stands alone; do not use ellipses, generic AI formulas such as “what it means for” or “everything you need to know about,” or awkward truncation. Do not make the two titles identical when the full title is longer than 65 characters. First choose articleType from ${ARTICLE_TYPES.join(", ")} and category from ${CATEGORIES.join(", ")} based on the primary subject, not incidental keywords. Return articleType, category, categoryConfidence (0-1), categoryReason, tags, title, displayTitle, description, moods, quickRead (null when not useful), bodyMarkdown, contextualPoll (null or question/options), reactionPrompt, seoTitle, seoDescription, imageIntent, requiresExactImage, product (null or {brand,productName,model,category,barcode}). Use the structural guidance for the selected type: trend=hook/what is happening/why now/evidence/why it matters/what next; explainer=direct answer/context/examples/nuance/next question; slang_definition=definition/examples/context/what it does not mean/related terms; guide=problem/steps/examples/pitfalls/summary; personal_story=open inside the event/chronology/specific supplied details/conflict/resolution/question; reported_story=lead/verified facts/source-backed context/uncertainty/analysis/conclusion. Do not force headings when they do not suit the type. Use only supported research. Candidate category is only a signal; the model may disagree. Suggested classification: ${JSON.stringify(classification)}. Research packet: ${JSON.stringify(research)} Candidate: ${JSON.stringify(candidate)}`;
  const request = { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brisastory.live", "X-Title": "BrisaStory Article Drafts" }, body: JSON.stringify({ model, temperature: 0.4, max_tokens: 3200, response_format: { type: "json_object" }, messages: [{ role: "system", content: `${BRISAStory_WRITING_BRIEF} Return JSON only. Never fabricate unsupported facts.` }, { role: "user", content: prompt }] }) };
  let content = "";
  let lastFailure = "OpenRouter returned no article";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await json("https://openrouter.ai/api/v1/chat/completions", request);
      content = String(response.choices?.[0]?.message?.content ?? "").trim();
      if (content) break;
      lastFailure = `OpenRouter returned no article (attempt ${attempt}/2)`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "OpenRouter article request failed";
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750));
  }
  if (!content) throw new Error(lastFailure);
  const article = parseModelJson(content);
  article.articleType = normalizeArticleType(article.articleType, candidate);
  const modelClassification = classifyEditorialCategory({ ...candidate, ...article });
  article.category = modelClassification.category;
  article.categoryConfidence = Math.min(Number(article.categoryConfidence ?? modelClassification.categoryConfidence), modelClassification.categoryConfidence);
  article.categoryReason = String(article.categoryReason ?? modelClassification.categoryReason);
  article.tags = normalizeArticleTags(article.tags);
  article.displayTitle = repairDisplayTitle(article.title, article.displayTitle) ?? String(article.displayTitle ?? "").trim();
  article.slug = slugify(article.title);
  return article;
}

function canonicalImageUrl(value) { try { const url = new URL(String(value)); url.search = ""; url.hash = ""; return url.toString().replace(/\/$/, ""); } catch { return String(value ?? "").split("?")[0]; } }

function staticImageUrls() {
  const found = new Set();
  const walk = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mdx")) {
        const text = fs.readFileSync(full, "utf8");
        for (const match of text.matchAll(/(?:image:\s*"|\]\()([^"\s)]+\.(?:jpg|jpeg|png|webp)(?:\?[^"\s)]*)?)/gi)) found.add(canonicalImageUrl(match[1]));
      }
    }
  };
  walk(path.join(process.cwd(), "content"));
  return found;
}

function staticArticleTitles() {
  const found = [];
  const walk = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mdx")) {
        const match = fs.readFileSync(full, "utf8").match(/^title:\s*["'](.+?)["']\s*$/m);
        if (match) found.push(match[1]);
      }
    }
  };
  walk(path.join(process.cwd(), "content"));
  return found;
}

export async function resolveImage(article, usedImages = new Set()) {
  const exact = Boolean(article.requiresExactImage);
  if (exact && article.product) {
    try {
      const { resolveProduct } = await import("./products/resolver.ts");
      const { validateProductImage } = await import("./products/image-validator.ts");
      const product = await resolveProduct(article.product);
      const check = await validateProductImage(product.imageUrl);
      if (product.exactMatch && product.isExactImage && check.valid) return { ...product, image: product.imageUrl, imageAlt: product.imageAlt || article.title, requiresExactImage: true, isExactImage: true, needsImageReview: false, product };
      return { ...product, image: product.imageUrl || "", imageAlt: product.imageAlt || article.title, requiresExactImage: true, isExactImage: false, needsImageReview: true, product };
    } catch { return { image: "", imageAlt: article.title, requiresExactImage: true, isExactImage: false, needsImageReview: true, failureReason: "PROVIDER_UNAVAILABLE" }; }
  }
  if (exact) {
    const icecat = await resolveIcecatProductImage(article);
    if (icecat) return icecat;
  }
  const key = process.env.PEXELS_API_KEY?.trim();
  if (exact) return { image: "", imageAlt: article.imageIntent || article.title, imageSourceType: "unresolved", requiresExactImage: true, isExactImage: false, needsImageReview: true };
  if (!key) return { image: "", imageAlt: article.imageIntent || article.title, imageSourceType: "unresolved", requiresExactImage: false, isExactImage: false, needsImageReview: true };
  const data = await json(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: article.imageIntent || article.title, orientation: "landscape", per_page: "5" })}`, { headers: { Authorization: key, accept: "application/json" } });
  const photo = (data.photos ?? []).find((candidate) => !usedImages.has(canonicalImageUrl(candidate.src.large2x || candidate.src.large)));
  if (!photo) return { image: "", imageAlt: article.imageIntent || article.title, imageSourceType: "unresolved", requiresExactImage: false, isExactImage: false, needsImageReview: true };
  return { image: photo.src.large2x || photo.src.large, imageAlt: photo.alt || article.title, imageCredit: photo.photographer, imageCreditUrl: photo.photographer_url, imageSourceType: "pexels", imageSourceUrl: photo.url, requiresExactImage: false, isExactImage: false, needsImageReview: false };
}

function productTokens(article) { return String(article.imageIntent || article.title || "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2); }

export async function resolveIcecatProductImage(article) {
  const apiUrl = process.env.ICECAT_API_URL?.trim();
  const apiToken = process.env.ICECAT_API_TOKEN?.trim();
  const contentToken = process.env.ICECAT_CONTENT_TOKEN?.trim();
  if (!apiUrl || !apiToken || !contentToken) return null;
  try {
    const url = new URL(apiUrl);
    url.searchParams.set("query", String(article.imageIntent || article.title));
    const response = await cronFetch(url, { headers: { Authorization: `Bearer ${apiToken}`, "X-Icecat-Content-Token": contentToken, Accept: "application/json" }, next: { revalidate: 86400 } }, 12_000);
    if (!response.ok) return null;
    const data = await response.json();
    const products = Array.isArray(data.products) ? data.products : Array.isArray(data.results) ? data.results : [];
    const tokens = productTokens(article);
    const match = products.find((product) => {
      const name = String(product.name || product.productName || product.title || "").toLowerCase();
      const image = product.image || product.imageUrl || product.mainImage || product.images?.[0];
      return image && tokens.filter((token) => name.includes(token)).length >= Math.max(2, Math.ceil(tokens.length * 0.5));
    });
    if (!match) return null;
    const image = String(match.image || match.imageUrl || match.mainImage || match.images?.[0] || "");
    if (!image.startsWith("http")) return null;
    return { image, imageAlt: String(match.name || match.productName || article.title), imageCredit: "Icecat", imageCreditUrl: String(match.url || "https://icecat.com"), imageSourceType: "licensed", imageSourceUrl: String(match.url || "https://icecat.com"), imageLicense: "Icecat product content license", requiresExactImage: true, isExactImage: true, needsImageReview: false };
  } catch { return null; }
}

export async function verifyImageAsset(image) {
  if (!image?.image) return { valid: false, reason: "missing image" };
  try { const response = await cronFetch(image.image, { method: "HEAD" }, 8_000); return { valid: response.ok, reason: response.ok ? "reachable" : `image returned ${response.status}` }; } catch { return { valid: false, reason: "image request failed" }; }
}

export function addInternalLinks(bodyMarkdown, article, candidates = []) {
  const links = candidates.filter((candidate) => candidate.slug && candidate.slug !== article.slug && candidate.category && candidate.title).filter((candidate) => bodyMarkdown.toLowerCase().includes(String(candidate.category).toLowerCase()) || article.tags?.some((tag) => String(candidate.title).toLowerCase().includes(String(tag).toLowerCase()))).slice(0, 4);
  if (!links.length) return { bodyMarkdown, links: [] };
  const related = `\n\n## More from BrisaStory\n\n${links.map((link) => `- [${link.title}](/${link.category}/${link.slug})`).join("\n")}`;
  return { bodyMarkdown: `${bodyMarkdown.trim()}${related}`, links: links.map((link) => `/${link.category}/${link.slug}`) };
}

export async function createArticleDraft({ candidate, dryRun = false, autoPublish = false, editionKey, usedImages = new Set() }) {
  candidate = { ...candidate, category: normalizeEditorialCategory(candidate?.category) };
  const research = await researchCandidate(candidate);
  const article = await generateArticle({ candidate, research });
  const image = await resolveImage(article, usedImages);
  const imageCheck = await verifyImageAsset(image);
  let internalCandidates = [];
  const { APPWRITE_ENDPOINT: articleEndpoint, APPWRITE_PROJECT_ID: articleProject, APPWRITE_API_KEY: articleKey, APPWRITE_DATABASE_ID: articleDatabase = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: articleCollection = "editorial_content" } = process.env;
  if (articleEndpoint && articleProject && articleKey) {
    try {
      const db = new Databases(new Client().setEndpoint(articleEndpoint).setProject(articleProject).setKey(articleKey));
      const rows = await db.listDocuments(articleDatabase, articleCollection, [Query.equal("type", "article"), Query.equal("status", "published"), Query.limit(100)]);
      internalCandidates = rows.documents.flatMap((row) => { try { const value = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; return value?.slug ? [value] : []; } catch { return []; } });
    } catch { internalCandidates = []; }
  }
  const linked = addInternalLinks(article.bodyMarkdown, article, internalCandidates);
  article.bodyMarkdown = linked.bodyMarkdown;
  const validation = validateGeneratedArticle(article, research);
  const structure = detectStructuralRepetition(article, internalCandidates);
  if (structure.repeated) validation.errors.push("heading structure repeats a recent generated article");
  validation.valid = validation.errors.length === 0;
  const needsReview = Boolean(validation.needsReview || structure.repeated || image.needsImageReview || !imageCheck.valid || !research.valid);
  const canAutoPublish = autoPublish && validation.valid && !needsReview;
  const publicationTime = new Date().toISOString();
  const draft = { ...article, ...image, imageVerified: imageCheck.valid, internalLinks: linked.links, slug: article.slug, research, validation, status: canAutoPublish ? "published" : "draft", publishAt: canAutoPublish ? publicationTime : undefined, needsReview, contentOrigin: "ai_researched", originalReporting: false, generatedBy: "openrouter/free", generatedAt: publicationTime, researchGeneratedAt: publicationTime, researchStatus: research.status, factCheckStatus: validation.claimValidation?.valid ? "passed" : "review", sourceTrendIds: (candidate.sources ?? []).map((source) => source.trendId).filter(Boolean), sourceUrls: (candidate.sources ?? []).map((source) => source.url).filter(Boolean), trendScore: candidate.trendScore ?? 0, trendSources: (candidate.sources ?? []).map((source) => source.url).filter(Boolean), sourceCount: research.sources.length, editorialVersion: "long-form-v2" };
  if (dryRun) return draft;
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) throw new Error("Appwrite credentials are required");
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const existing = await db.listDocuments(database, collection, [Query.equal("type", "article"), Query.limit(100)]);
  if (existing.documents.some((row) => {
    const existingTitle = String(row.title ?? "");
    return normalize(existingTitle) === normalize(article.title)
      || row.externalId === article.slug
      || similarity(existingTitle, article.title) >= 0.7
      || sameUnderlyingTopic(existingTitle, article.title);
  })) return { ...draft, duplicate: true };
  const document = await db.createDocument(database, collection, ID.unique(), { type: "article", slot: canAutoPublish ? "article_published" : "article_draft", externalId: article.slug, editionKey: editionKey || undefined, title: article.title, description: article.description, articleType: article.articleType, contentOrigin: draft.contentOrigin, originalReporting: false, generatedBy: draft.generatedBy, editorialVersion: draft.editorialVersion, categoryConfidence: article.categoryConfidence, researchStatus: draft.researchStatus, factCheckStatus: draft.factCheckStatus, status: canAutoPublish ? "published" : "candidate", publishAt: canAutoPublish ? publicationTime : undefined, payload: JSON.stringify(draft), createdAt: publicationTime, updatedAt: publicationTime });
  return { ...draft, appwriteId: document.$id };
}

export async function generateArticleDrafts({ count = 1, dryRun = false, autoPublish = false, trendPack } = {}) {
  const trends = trendPack?.trends ?? await collectSoutheastAsiaTrends();
  const existingTitles = staticArticleTitles();
  const candidates = trends.filter((candidate) => !existingTitles.some((title) => normalize(title) === normalize(candidate.title) || similarity(title, candidate.title) >= 0.7)).slice(0, Math.min(count, 1)).map((candidate) => ({
    ...candidate,
    sources: [candidate],
    category: normalizeEditorialCategory(candidate.category) || inferEditorialCategory(candidate),
  }));
  const usedImages = staticImageUrls();
  const { APPWRITE_ENDPOINT: mediaEndpoint, APPWRITE_PROJECT_ID: mediaProject, APPWRITE_API_KEY: mediaKey, APPWRITE_DATABASE_ID: mediaDatabase = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: mediaCollection = "editorial_content" } = process.env;
  if (mediaEndpoint && mediaProject && mediaKey) {
    try {
      const mediaDb = new Databases(new Client().setEndpoint(mediaEndpoint).setProject(mediaProject).setKey(mediaKey));
      const mediaRows = await mediaDb.listDocuments(mediaDatabase, mediaCollection, [Query.equal("type", "article"), Query.limit(100)]);
      for (const row of mediaRows.documents) { const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; if (payload?.image) usedImages.add(canonicalImageUrl(payload.image)); }
    } catch { /* static image protection still applies when Appwrite is unavailable */ }
  }
  const results = [];
  for (const candidate of candidates) {
    try { const result = await createArticleDraft({ candidate, dryRun, autoPublish, usedImages }); if (result.image) usedImages.add(canonicalImageUrl(result.image)); results.push(result); } catch (error) { results.push({ status: "failed", error: error instanceof Error ? error.message : "generation failed" }); }
  }
  return { mode: autoPublish ? "validated-auto-publish" : "draft-only", candidates: candidates.length, results };
}
