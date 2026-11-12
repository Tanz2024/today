import { notFound } from "next/navigation";
import NewsFeed from "@/components/editorial/NewsFeed";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOPICS, getAiTopic } from "@/lib/ai-taxonomy";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return AI_TOPICS.map((topic) => ({ topic: topic.slug }));
}

export async function generateMetadata({ params }: PageProps<"/news/[topic]">) {
  const { topic: slug } = await params;
  const topic = getAiTopic(slug);
  if (!topic) return {};
  const count = selectAiArticles(await getPublicDiscoverableArticles()).filter((article) => article.aiTopic === topic.slug).length;
  // Topic pages with fewer than two stories are thin; keep them out of the index.
  return buildMetadata({ title: `${topic.name} — AI news`, description: topic.description, path: `/news/${topic.slug}`, noindex: count < 2 });
}

export default async function NewsTopicPage({ params }: PageProps<"/news/[topic]">) {
  const { topic: slug } = await params;
  const topic = getAiTopic(slug);
  if (!topic) notFound();
  const ai = selectAiArticles(await getPublicDiscoverableArticles());
  return <NewsFeed topic={topic} articles={ai.filter((article) => article.aiTopic === topic.slug)} allArticles={ai} />;
}
