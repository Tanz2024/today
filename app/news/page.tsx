import NewsFeed from "@/components/editorial/NewsFeed";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "AI news",
  description: "The latest TodayAI coverage of artificial intelligence: AI at work, in education, safety and policy, and everyday AI.",
  path: "/news",
});

export default async function NewsPage() {
  const ai = selectAiArticles(await getPublicDiscoverableArticles());
  return <NewsFeed articles={ai} allArticles={ai} />;
}
