import { Client, Databases, Query } from "node-appwrite";
import { getAllArticles } from "../../lib/articles.ts";
import { getPublishedGeneratedArticles } from "../../lib/generated-articles.ts";
import { selectCurationAssignments } from "../../lib/homepage-curation-core.ts";

export async function runDailyHomepageCuration(now = new Date()) {
  const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID: collection = "editorial_content" } = process.env;
  if (!endpoint || !project || !key) return { status: "skipped", reason: "Appwrite unavailable" };
  const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(now);
  const articles = [...getAllArticles(), ...(await getPublishedGeneratedArticles())].map((article) => ({ id: article.slug, slug: article.slug, category: article.category, title: article.title, date: article.date, status: "published" }));
  const configs = await db.listDocuments(database, collection, [Query.equal("type", "curation_config"), Query.limit(100)]);
  let generated = 0;
  for (const row of configs.documents) {
    let config; try { config = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload; } catch { continue; }
    const existing = await db.listDocuments(database, collection, [Query.equal("type", "homepage_assignment"), Query.equal("externalId", `${config.section}-${date}-1`), Query.limit(1)]);
    if (existing.documents.length) continue;
    const assignments = selectCurationAssignments(config, articles, now);
    for (const assignment of assignments) await db.createDocument(database, collection, "unique()".replace("unique()", `${assignment.section}-${assignment.editionDate}-${assignment.slot}`), { type: "homepage_assignment", slot: "homepage_curation", externalId: `${assignment.section}-${assignment.editionDate}-${assignment.slot}`, title: assignment.articleSlug, status: "published", editionKey: assignment.editionDate, displayOrder: assignment.slot, payload: JSON.stringify(assignment), createdAt: assignment.generatedAt, updatedAt: assignment.generatedAt });
    generated += assignments.length;
  }
  return { status: "success", date, generated };
}
