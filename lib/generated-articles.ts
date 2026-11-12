import "server-only";
import { unstable_cache } from "next/cache";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";
import type { Article } from "@/types/article";
import { loadRemoteArticles } from "@/lib/article-sources";
import { isAppwriteDatabaseUnavailable, warnAppwriteQuotaUnavailable } from "@/lib/appwrite-errors";

export type GeneratedArticlesResult = { status: "available"; articles: Article[] } | { status: "unavailable"; reason: "quota" | "timeout" };

const REMOTE_READ_TIMEOUT_MS = 8_000;

async function loadRemoteArticlesWithTimeout(db: Parameters<typeof loadRemoteArticles>[0], collections: Parameters<typeof loadRemoteArticles>[1]) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loadRemoteArticles(db, collections),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("REMOTE_ARTICLE_READ_TIMEOUT")), REMOTE_READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function listGenerated(): Promise<GeneratedArticlesResult> {
  const db = getDatabases(); if (!db) return { status: "available", articles: [] };
  try {
    return { status: "available", articles: await loadRemoteArticlesWithTimeout(db, {
      databaseId: APPWRITE_DATABASE_ID,
      editorialCollectionId: process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID ?? "editorial_content",
      communityCollectionId: process.env.APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID ?? "community_submissions",
    }) };
  } catch (error) {
    if (error instanceof Error && error.message === "REMOTE_ARTICLE_READ_TIMEOUT") {
      console.warn(`[todayai] remote article discovery timed out after ${REMOTE_READ_TIMEOUT_MS}ms; continuing with local content`);
      return { status: "unavailable", reason: "timeout" };
    }
    if (!isAppwriteDatabaseUnavailable(error)) throw error;
    warnAppwriteQuotaUnavailable("generated article discovery");
    return { status: "unavailable", reason: "quota" };
  }
}
export const getPublishedGeneratedArticlesResult = unstable_cache(listGenerated, ["published-generated-articles"], { revalidate: 3600, tags: ["articles", "homepage-editorial"] });
export async function getPublishedGeneratedArticles() { const result = await getPublishedGeneratedArticlesResult(); return result.status === "available" ? result.articles : []; }
export async function getPublishedGeneratedArticle(category: string, slug: string) { return (await getPublishedGeneratedArticles()).find((article) => article.category === category && article.slug === slug); }
