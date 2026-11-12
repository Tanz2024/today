const STOP_WORDS = new Set(["the", "and", "for", "with", "why", "what", "from", "this", "that", "are", "how", "your", "into", "about"]);
const YOUTH_TERMS = /gen z|gen alpha|teen|young adult|tiktok|youtube|roblox|discord|creator|viral|meme|dating|beauty|gaming|streaming|school|campus|fragrance|fashion|ai/i;
const EXCLUDED_PUBLISHER_PATTERNS = /press release|attorney|law firm|divorce attorney|award winner|awards|restaurant award|esim launch|product launch|trademark filing/i;
const SEA_TERMS = /malaysia|singapore|indonesia|thailand|vietnam|philippines|brunei|cambodia|asia|kuala lumpur|sea/i;

export function normalizeTrendText(value) {
  return String(value ?? "").toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

export function stableTrendId(source, url, title) {
  const value = normalizeTrendText(`${source}|${url}|${title}`);
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `trend-${(hash >>> 0).toString(16)}`;
}

function tokens(value) {
  return new Set(normalizeTrendText(value).split(" ").filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
}

export function similarity(a, b) {
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

export function scoreTrend(item, now = Date.now()) {
  const text = `${item.title ?? ""} ${item.summary ?? ""}`;
  const ageHours = item.publishedAt ? Math.max(0, (now - new Date(item.publishedAt).getTime()) / 3600000) : 48;
  const freshness = Math.max(0, 30 - Math.min(ageHours, 30));
  const youth = YOUTH_TERMS.test(text) ? 24 : 0;
  const sea = SEA_TERMS.test(text) ? 8 : 0;
  const searchIntent = /why|how|what is|meaning|trend|best|guide|should|is .* worth/i.test(text) ? 12 : 0;
  const confidence = item.source === "tavily" || item.source === "the-news-api" ? 12 : 5;
  return Math.round(freshness + youth + sea + searchIntent + confidence);
}

export function isEditoriallyRelevantTrend(item) {
  const text = `${item.title ?? ""} ${item.summary ?? ""}`;
  if (EXCLUDED_PUBLISHER_PATTERNS.test(text)) return false;
  return YOUTH_TERMS.test(text) || /dating|relationship|sex|friendship|internet culture|social media|music|movie|travel|shopping|money|wellness/i.test(text);
}

export function normalizeTrend(item, source) {
  const title = String(item.title ?? item.name ?? "").trim();
  const url = String(item.url ?? item.link ?? "").trim();
  const summary = String(item.summary ?? item.description ?? item.content ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!title || !url) return null;
  return {
    trendId: stableTrendId(source, url, title),
    title,
    summary,
    url,
    source,
    publishedAt: item.publishedAt ?? item.published_at ?? item.publishedAt ?? null,
    trendScore: scoreTrend({ ...item, title, summary, source }),
  };
}

export function buildDailyTrendPack(providerResults, { now = Date.now(), limit = 24 } = {}) {
  const all = providerResults.flatMap(({ source, items = [] }) => items.map((item) => normalizeTrend(item, source)).filter(Boolean).filter(isEditoriallyRelevantTrend));
  const deduped = [];
  for (const item of all.sort((a, b) => b.trendScore - a.trendScore)) {
    if (deduped.some((existing) => existing.url.replace(/[?#].*$/, "") === item.url.replace(/[?#].*$/, "") || similarity(existing.title, item.title) >= 0.8)) continue;
    deduped.push(item);
  }
  return {
    generatedAt: new Date(now).toISOString(),
    trends: deduped.slice(0, limit),
    providers: Object.fromEntries(providerResults.map((result) => [result.source, { status: result.status, count: result.items?.length ?? 0, reason: result.reason }])) ,
  };
}

export function selectTrend(pack, usedTopics = []) {
  return pack.trends.find((trend) => !usedTopics.some((topic) => similarity(topic, trend.title) >= 0.65)) ?? null;
}

export function questionIsDuplicate(question, previousQuestions = []) {
  return previousQuestions.some((previous) => similarity(question, previous) >= 0.45 || normalizeTrendText(question) === normalizeTrendText(previous));
}
