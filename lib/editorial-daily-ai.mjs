const THEMES = [
  "work, campus & starting the week",
  "dating, friendship & texting",
  "money, shopping & products",
  "internet, AI, apps & gaming",
  "food, nightlife & going out",
  "relationships, drama & chaotic life",
  "music, movies, anime & entertainment",
];
const COUNTRIES = ["Malaysia", "Singapore", "Indonesia", "Thailand", "Vietnam", "Philippines", "Brunei", "Cambodia", "Laos", "Myanmar"];
const REGIONAL_TERMS = COUNTRIES.map((country) => country.toLowerCase());
const MALAYSIA_TERMS = ["malaysia", "kuala lumpur", "kl", "penang", "johor", "selangor", "malacca", "melaka", "sabah", "sarawak"];
void REGIONAL_TERMS;
void MALAYSIA_TERMS;
import { buildDailyTrendPack, questionIsDuplicate } from "./daily-trend-pack.mjs";
import { cronFetch } from "./cron-fetch.mjs";

export function malaysiaTheme(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kuala_Lumpur", weekday: "short" }).formatToParts(date).find((part) => part.type === "weekday")?.value;
  return THEMES[{ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday] ?? 0];
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

export async function collectDailyTrendPack() {
  const providerResults = [];
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const newsKey = process.env.THE_NEWS_API_TOKEN?.trim();
  const providers = [
    tavilyKey ? ["tavily", async () => (await json("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: tavilyKey, query: `latest global youth culture Gen Z Gen Alpha TikTok internet trends Southeast Asia ${COUNTRIES.slice(0, 5).join(" ")}`, topic: "news", time_range: "day", max_results: 8, include_answer: false }) })).results ?? []] : null,
    newsKey ? ["the-news-api", async () => (await json(`https://api.thenewsapi.com/v1/news/all?api_token=${encodeURIComponent(newsKey)}&search=${encodeURIComponent("Gen Z OR Gen Alpha OR TikTok OR Roblox OR dating OR beauty")}&language=en&limit=8`, { headers: { accept: "application/json" } })).data ?? []] : null,
  ].filter(Boolean);
  for (const [source, load] of providers) {
    try { providerResults.push({ source, status: "success", items: await load() }); }
    catch (error) { providerResults.push({ source, status: "failed", items: [], reason: error instanceof Error ? error.message : "provider failed" }); }
  }
  return buildDailyTrendPack(providerResults);
}

export async function collectSoutheastAsiaTrends() {
  return (await collectDailyTrendPack()).trends;
}

const prohibited = /\b(race|racial|ethnic|religion|terrorist|kill|murder|suicide|self[- ]harm|diagnos(?:e|is|tic)?|prescription|lawsuit|guilty|criminal|defamation|illegal)\b/i;
const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function validateDailyGeneration(candidate, { trends = [], previousQuestions = [] } = {}) {
  const errors = [];
  const fields = [candidate?.pulse?.question, candidate?.trivia?.question, candidate?.groupChat?.question, candidate?.dailyDropQuestion, candidate?.realQuestion];
  if (!candidate?.topic || !candidate?.pulse || !candidate?.trivia || !candidate?.groupChat || fields.some((value) => typeof value !== "string" || !value.trim())) errors.push("missing required fields");
  for (const item of [candidate?.pulse, candidate?.trivia]) if (!Array.isArray(item?.options) || item.options.length < 2 || item.options.length > 4 || new Set(item.options.map(normalize)).size !== item.options.length) errors.push("options must contain 2 to 4 unique labels");
  if (typeof candidate?.trivia?.correctAnswer !== "string" || !candidate.trivia.options?.includes(candidate.trivia.correctAnswer) || typeof candidate.trivia.explanation !== "string" || !candidate.trivia.explanation.trim()) errors.push("invalid trivia answer");
  const questions = fields.filter((value) => typeof value === "string").map(normalize);
  if (new Set(questions).size !== questions.length || questions.some((question) => questionIsDuplicate(question, previousQuestions))) errors.push("duplicate question");
  if (fields.some((value) => prohibited.test(String(value))) || prohibited.test(String(candidate.topic))) errors.push("unsafe content");
  if (trends.length && !normalize(`${candidate.topic} ${fields.join(" ")}`).split(" ").some((word) => word.length > 4 && trends.some((trend) => normalize(`${trend.title} ${trend.summary}`).includes(word)))) errors.push("weak trend connection");
  return { valid: errors.length === 0, errors };
}

export async function generateDailyEdition({ date = new Date(), trends, previousQuestions = [] } = {}) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  if (!key) return { status: "missing", errors: ["OPENROUTER_API_KEY missing"] };
  const theme = malaysiaTheme(date);
  const trendItems = Array.isArray(trends) ? trends : trends?.trends ?? [];
  const prompt = `TodayAI global youth editor. Date: ${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(date)}. Preferred theme: ${theme}. Create fresh safe, playful, specific formats from the strongest current trend. No invented facts; avoid medical, legal, discriminatory, defamatory or dangerous content. Return ONLY compact JSON with: topic; pulse{question,options}; trivia{question,options,correctAnswer,explanation}; groupChat{question}; dailyDropQuestion; realQuestion. This or That is manually curated separately and must not be generated. Options: 2-4.\nTRENDS:${JSON.stringify(trendItems)}\nAVOID:${JSON.stringify(previousQuestions.slice(0, 30))}`;
  const request = { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brisastory.live", "X-Title": "TodayAI Daily Editorial" }, body: JSON.stringify({ model, temperature: 0.35, max_tokens: 900, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return compact strict JSON only. Do not use markdown fences or commentary. Keep every string concise." }, { role: "user", content: prompt }] }) };
  let candidate;
  let lastError = "OpenRouter returned no content";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await json("https://openrouter.ai/api/v1/chat/completions", request);
      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenRouter returned no content");
      candidate = parseModelJson(content);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "OpenRouter returned invalid JSON";
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  if (!candidate) return { status: "failed", errors: [lastError] };
  const validation = validateDailyGeneration(candidate, { trends: trendItems, previousQuestions });
  return validation.valid ? { status: "success", theme, candidate } : { status: "rejected", theme, errors: validation.errors };
}
