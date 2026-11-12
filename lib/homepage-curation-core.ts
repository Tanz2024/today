export type CurationMode = "AUTO" | "MANUAL" | "HYBRID";
export type CurationArticle = { id?: string; slug: string; title?: string; category?: string; date?: string; status?: string; publishedAt?: string };
export type CurationConfig = { section: string; mode: CurationMode; slots: number; categories?: string[]; pinnedArticleIds?: string[]; freshnessDays?: number; region?: string; priority?: "recency" | "engagement" };
export type CurationAssignment = { section: string; editionDate: string; slot: number; articleId: string; articleSlug: string; source: "manual" | "auto"; generatedAt: string };

export function malaysiaEditionDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now); }
function isPublished(article: CurationArticle) { return article.status === undefined || article.status === "published"; }
function eligible(article: CurationArticle, config: CurationConfig, now: Date) {
  if (!isPublished(article)) return false;
  if (config.categories?.length && !config.categories.includes(article.category ?? "")) return false;
  if (config.freshnessDays !== undefined && article.date) { const age = now.getTime() - new Date(article.date).getTime(); if (age < 0 || age > config.freshnessDays * 86400000) return false; }
  return true;
}
export function selectCurationAssignments(config: CurationConfig, articles: CurationArticle[], now = new Date(), previousAutoSlugs = new Set<string>()): CurationAssignment[] {
  const byId = new Map(articles.map((article) => [article.id ?? article.slug, article]));
  const pinned = (config.pinnedArticleIds ?? []).map((id) => byId.get(id)).filter((article): article is CurationArticle => Boolean(article && eligible(article, config, now)));
  const used = new Set(pinned.map((article) => article.slug));
  const candidates = articles.filter((article) => eligible(article, config, now) && !used.has(article.slug)).sort((a, b) => new Date(b.date ?? b.publishedAt ?? 0).getTime() - new Date(a.date ?? a.publishedAt ?? 0).getTime());
  if (candidates.length > config.slots && previousAutoSlugs.size) { const fresh = candidates.filter((article) => !previousAutoSlugs.has(article.slug)); candidates.splice(0, candidates.length, ...fresh, ...candidates.filter((article) => previousAutoSlugs.has(article.slug))); }
  const selected = config.mode === "MANUAL" ? pinned.slice(0, config.slots) : [...pinned, ...candidates].slice(0, config.slots);
  return selected.map((article, index) => ({ section: config.section, editionDate: malaysiaEditionDate(now), slot: index + 1, articleId: article.id ?? article.slug, articleSlug: article.slug, source: pinned.some((item) => item.slug === article.slug) ? "manual" : "auto", generatedAt: now.toISOString() }));
}
