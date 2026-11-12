import "server-only";
import type { Article } from "@/types/article";
import { classifyAiTopic, classifyContentType, getAiTopic, type AiTopicSlug, type ContentType } from "@/lib/ai-taxonomy";

export type AiArticle = Article & { aiTopic: AiTopicSlug; aiTopicName: string; contentKind: ContentType };

const byNewest = (a: Article, b: Article) => new Date(b.date).getTime() - new Date(a.date).getTime();

/** AI coverage only, classified with the structured taxonomy, newest first. */
export function selectAiArticles(articles: Article[]): AiArticle[] {
  const result: AiArticle[] = [];
  for (const article of articles) {
    const topic = classifyAiTopic(article);
    if (!topic) continue;
    result.push({ ...article, aiTopic: topic, aiTopicName: getAiTopic(topic)?.name ?? "AI", contentKind: classifyContentType(article) });
  }
  return result.sort(byNewest);
}

export function articlePath(article: Pick<Article, "category" | "slug">) {
  return `/${article.category}/${article.slug}`;
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
