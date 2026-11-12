export const RECENT_READ_KEY = "brisastory:recently-read";
export const MAX_RECENT_READS = 25;
export function readRecentArticles(storage: Pick<Storage, "getItem"> | null): string[] { try { const value = storage?.getItem(RECENT_READ_KEY); const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT_READS) : []; } catch { return []; } }
export function rememberRecentArticle(slug: string, storage: Pick<Storage, "getItem" | "setItem"> | null): string[] { const next = [slug, ...readRecentArticles(storage).filter((item) => item !== slug)].slice(0, MAX_RECENT_READS); try { storage?.setItem(RECENT_READ_KEY, JSON.stringify(next)); } catch {} return next; }
export function deprioritizeRecentlyRead<T extends { slug: string }>(items: T[], recent: string[]): T[] { const seen = new Set(recent); return [...items].sort((a, b) => Number(seen.has(a.slug)) - Number(seen.has(b.slug))); }
