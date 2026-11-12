import { ID, Query } from "node-appwrite";
import { unstable_cache } from "next/cache";
import { getDatabases } from "@/lib/appwrite";
import type { Article } from "@/types/article";
export * from "./homepage-curation-core";
import { malaysiaEditionDate } from "./homepage-curation-core";
import type { CurationAssignment, CurationConfig } from "./homepage-curation-core";


const dbConfig = { database: process.env.APPWRITE_DATABASE_ID ?? "brisastory", collection: process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID ?? "editorial_content" };
type HomepageCurationPayload = {
  configs: Record<string, CurationConfig>;
  assignments: Record<string, CurationAssignment[]>;
};

async function listCurationDocuments(type: string, section: string) {
  const db = getDatabases();
  if (!db) return [];
  try { const result = await db.listDocuments(dbConfig.database, dbConfig.collection, [Query.equal("type", type), Query.equal("externalId", section), Query.limit(100)]); return result.documents as unknown as Array<Record<string, unknown>>; } catch { return []; }
}

function parseCurationConfig(row: Record<string, unknown>): CurationConfig | null {
  const payload = row.payload;
  if (!payload) return null;
  try { return typeof payload === "string" ? JSON.parse(payload) as CurationConfig : payload as CurationConfig; } catch { return null; }
}

const getHomepageCurationConfigs = unstable_cache(async (sections: string[]): Promise<Record<string, CurationConfig>> => {
  const db = getDatabases();
  if (!db) return {};
  try {
    const result = await db.listDocuments(dbConfig.database, dbConfig.collection, [Query.equal("type", "curation_config"), Query.limit(100)]);
    const configs = result.documents.map((row) => parseCurationConfig(row as unknown as Record<string, unknown>)).filter((config): config is CurationConfig => Boolean(config));
    return Object.fromEntries(configs.filter((config) => sections.includes(config.section)).map((config) => [config.section, config]));
  } catch { return {}; }
}, ["homepage-curation-configs"], { revalidate: 3600, tags: ["homepage-editorial"] });

export const getCurationConfig = unstable_cache(async (section: string): Promise<CurationConfig | null> => {
  const rows = await listCurationDocuments("curation_config", section);
  const payload = rows[0]?.payload;
  if (!payload) return null;
  try { return typeof payload === "string" ? JSON.parse(payload) as CurationConfig : payload as CurationConfig; } catch { return null; }
}, ["homepage-curation-config"], { revalidate: 3600, tags: ["homepage-editorial"] });

export async function getDailyCurationAssignments(section: string, date = malaysiaEditionDate()) {
  const db = getDatabases();
  if (!db) return [];
  try {
    const result = await db.listDocuments(dbConfig.database, dbConfig.collection, [Query.equal("type", "homepage_assignment"), Query.equal("externalId", `${section}-${date}`), Query.limit(20)]);
    return result.documents as unknown as CurationAssignment[];
  } catch { return []; }
}

export async function getHomepageCurationData(sections: string[], date = malaysiaEditionDate()) {
  const externalIds = sections.map((section) => `${section}-${date}`);
  const configs = await getHomepageCurationConfigs(sections);
  const assignments: Record<string, CurationAssignment[]> = Object.fromEntries(sections.map((section) => [section, []]));
  const db = getDatabases();
  if (db) {
    try {
      const result = await db.listDocuments(dbConfig.database, dbConfig.collection, [
        Query.equal("type", "homepage_assignment"),
        Query.equal("externalId", externalIds),
        Query.limit(Math.max(20, sections.length * 20)),
      ]);
      for (const row of result.documents) {
        const externalId = String(row.externalId ?? "");
        const section = sections.find((candidate) => externalId === `${candidate}-${date}`);
        if (section) assignments[section].push(row as unknown as CurationAssignment);
      }
    } catch { /* Preserve empty assignment arrays for each requested section. */ }
  }
  return { configs, assignments };
}

export async function listCurationConfigs() {
  const db = getDatabases();
  if (!db) return [];
  try { const result = await db.listDocuments(dbConfig.database, dbConfig.collection, [Query.equal("type", "curation_config"), Query.limit(100)]); return result.documents.map((row) => { try { return typeof row.payload === "string" ? JSON.parse(row.payload) as CurationConfig : row.payload as CurationConfig; } catch { return null; } }).filter(Boolean) as CurationConfig[]; } catch { return []; }
}

export async function saveCurationConfig(config: CurationConfig) {
  const db = getDatabases();
  if (!db) throw new Error("Appwrite is not configured");
  const existing = await listCurationDocuments("curation_config", config.section);
  const data = { type: "curation_config", slot: "homepage_curation", externalId: config.section, title: config.section, status: "published", payload: JSON.stringify(config), updatedAt: new Date().toISOString() };
  if (existing[0]) await db.updateDocument(dbConfig.database, dbConfig.collection, existing[0].$id as string, data);
  else await db.createDocument(dbConfig.database, dbConfig.collection, ID.unique(), { ...data, createdAt: new Date().toISOString() });
  return config;
}

export async function resolveCuratedArticles(section: string, articles: Article[]) {
  const config = await getCurationConfig(section);
  if (!config) return null;
  const assignments = await getDailyCurationAssignments(section);
  if (!assignments.length) return [];
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  return assignments.sort((a, b) => a.slot - b.slot).map((assignment) => bySlug.get(assignment.articleSlug)).filter((article): article is Article => Boolean(article));
}

export function resolveCuratedArticlesFromData(section: string, articles: Article[], data: HomepageCurationPayload) {
  if (!data.configs[section]) return null;
  const assignments = data.assignments[section] ?? [];
  if (!assignments.length) return [];
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  return assignments.sort((a, b) => a.slot - b.slot).map((assignment) => bySlug.get(assignment.articleSlug)).filter((article): article is Article => Boolean(article));
}

export async function persistDailyCurationAssignments(assignments: CurationAssignment[]) {
  const db = getDatabases();
  if (!db || assignments.length === 0) return assignments;
  for (const assignment of assignments) {
    const externalId = `${assignment.section}-${assignment.editionDate}-${assignment.slot}`;
    const existing = await db.listDocuments(dbConfig.database, dbConfig.collection, [Query.equal("type", "homepage_assignment"), Query.equal("externalId", externalId), Query.limit(1)]);
    const data = { type: "homepage_assignment", slot: "homepage_curation", externalId, title: assignment.articleSlug, status: "published", editionKey: assignment.editionDate, displayOrder: assignment.slot, payload: JSON.stringify(assignment), createdAt: assignment.generatedAt, updatedAt: assignment.generatedAt };
    if (existing.documents[0]) await db.updateDocument(dbConfig.database, dbConfig.collection, existing.documents[0].$id, data);
    else await db.createDocument(dbConfig.database, dbConfig.collection, ID.unique(), data);
  }
  return assignments;
}
