// Appwrite-backed article loading, kept free of Next.js/server-only imports so
// it can be tested with a mocked Databases client. lib/generated-articles.ts
// wraps it with the real client and the shared cache.
import { Query } from "node-appwrite";
import type { Article } from "@/types/article";
import { clampToLaunch } from "./launch.ts";
import { resolveImage } from "./images.ts";
import { formatReadingTime } from "./reading-time.ts";

type Row = Record<string, unknown> & { $id?: string };

export interface DocumentLister {
  listDocuments(databaseId: string, collectionId: string, queries?: string[]): Promise<{ documents: unknown[] }>;
}

export const PAGE_SIZE = 100;
// 100 pages × 100 = 10,000 published rows per collection. Hitting it logs a
// warning rather than silently truncating.
export const MAX_PAGES = 100;

// Lists every matching document with cursor pagination: one request per 100
// rows, never one per article.
export async function listAllDocuments(db: DocumentLister, databaseId: string, collectionId: string, queries: string[], pageSize = PAGE_SIZE, maxPages = MAX_PAGES): Promise<Row[]> {
  const documents: Row[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await db.listDocuments(databaseId, collectionId, [...queries, Query.limit(pageSize), ...(cursor ? [Query.cursorAfter(cursor)] : [])]);
    const rows = result.documents as Row[];
    documents.push(...rows);
    const last = rows.at(-1)?.$id;
    if (rows.length < pageSize || !last) return documents;
    cursor = last;
  }
  console.warn(`[brisastory] ${collectionId}: stopped after ${maxPages} pages (${documents.length} rows); raise MAX_PAGES`);
  return documents;
}

const CATEGORY_ALIASES: Record<string, string> = { meaning: "culture", social: "culture", food: "travel", entertainment: "culture", gaming: "culture", technology: "campus", "self-care": "relationships" };
function canonicalCategory(value: string) {
  const category = value.trim().toLowerCase();
  return CATEGORY_ALIASES[category] ?? category;
}

// First value that parses as a real date, or null. Never "now".
function firstDate(...values: unknown[]): Date | null {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

// dateModified: a real update timestamp when it is not earlier than the
// publish date, otherwise the publish date. Never empty.
function modifiedDate(published: Date, ...values: unknown[]): string {
  const updated = firstDate(...values);
  return (updated && updated.getTime() > published.getTime() ? updated : published).toISOString();
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String); } catch { /* comma list */ }
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function communityMarkdown(content: string) {
  try {
    const document = JSON.parse(content) as { blocks?: Array<Record<string, unknown>> };
    return (document.blocks ?? []).map((block) => {
      const text = typeof block.text === "string" ? block.text : "";
      if (block.type === "heading") return `## ${text}`;
      if (block.type === "quote") return `> ${text}`;
      if (block.type === "divider") return "---";
      return text;
    }).filter(Boolean).join("\n\n");
  } catch { return ""; }
}

export function toCommunityArticle(row: Row, publicMediaUrl = process.env.R2_PUBLIC_URL): Article | null {
  if (row.source !== "community" || row.status !== "published" || typeof row.content !== "string") return null;
  const category = canonicalCategory(String(row.category ?? "culture"));
  const slug = String(row.slug ?? "");
  const content = communityMarkdown(row.content);
  const published = firstDate(row.publishedAt, row.createdAt, row.$createdAt);
  if (!slug || !content || !published) return null;
  const title = String(row.title ?? "");
  const cover = row.coverObjectKey && publicMediaUrl ? `${publicMediaUrl.replace(/\/$/, "")}/${row.coverObjectKey}` : undefined;
  return {
    isGenerated: true,
    source: "community",
    content,
    slug,
    title,
    description: String(row.description ?? ""),
    category,
    tags: parseTags(row.tags),
    date: published.toISOString(),
    updated: modifiedDate(published, row.reviewedAt),
    // Same fallback as MDX articles (lib/images.ts); metadata skips it.
    ...resolveImage(cover, cover ? title || "Community story" : undefined),
    readingTime: formatReadingTime(content),
    author: String(row.displayNameSnapshot ?? "Community contributor"),
    status: "published",
  };
}

export function toEditorialArticle(row: Row): Article | null {
  if (row.status !== "published") return null;
  let payload: Record<string, unknown>;
  try { payload = typeof row.payload === "string" ? JSON.parse(row.payload) : (row.payload as Record<string, unknown>); } catch { return null; }
  if (!payload || typeof payload.slug !== "string" || typeof payload.bodyMarkdown !== "string" || typeof payload.category !== "string") return null;
  const firstPublished = firstDate(payload.publishAt, row.publishAt, payload.createdAt, row.createdAt, row.$createdAt);
  if (!firstPublished) return null;
  const published = clampToLaunch(firstPublished);
  const content = String(payload.bodyMarkdown);
  const title = String(payload.title ?? row.title ?? "");
  return {
    ...(payload as unknown as Article),
    isGenerated: true,
    source: "editorial",
    content,
    slug: String(payload.slug),
    title,
    description: String(payload.description ?? row.description ?? ""),
    category: canonicalCategory(String(payload.category)),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    date: published.toISOString(),
    updated: modifiedDate(published, payload.updatedAt, row.updatedAt),
    ...resolveImage(typeof payload.image === "string" && payload.image ? payload.image : undefined, String(payload.imageAlt ?? title)),
    readingTime: formatReadingTime(content),
    status: "published",
  };
}

export interface RemoteCollections {
  databaseId: string;
  editorialCollectionId: string;
  communityCollectionId: string;
}

// Cold cost: ceil(editorial/100) + ceil(community/100) list requests (plus one
// empty page when a count is an exact multiple of 100).
export async function loadRemoteArticles(db: DocumentLister, collections: RemoteCollections): Promise<Article[]> {
  const editorialRows = await listAllDocuments(db, collections.databaseId, collections.editorialCollectionId, [Query.equal("type", "article"), Query.equal("status", "published")]);
  const editorial = editorialRows.map(toEditorialArticle).filter((article): article is Article => Boolean(article));
  let community: Article[] = [];
  try {
    const rows = await listAllDocuments(db, collections.databaseId, collections.communityCollectionId, [Query.equal("source", "community"), Query.equal("status", "published")]);
    community = rows.map((row) => toCommunityArticle(row)).filter((article): article is Article => Boolean(article));
  } catch { /* Community remains optional when its collection is not configured. */ }
  return [...editorial, ...community];
}
