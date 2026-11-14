import { notFound } from "next/navigation";
import { classifyAiTopic } from "@/lib/ai-taxonomy";
import ArticleView from "@/components/article/ArticleView";
import { CATEGORIES, getCategoryMeta } from "@/lib/categories";
import { getArticleBySlug, getArticlesByCategory } from "@/lib/articles";
import { buildMetadata } from "@/lib/seo";
import { hasIndexableImage } from "@/lib/article-discovery";
import { resolveArticleAuthor } from "@/lib/structured-data";
import { displayArticleDescription } from "@/lib/article-display";
import { getPublishedGeneratedArticles, getPublishedGeneratedArticle } from "@/lib/generated-articles";

export async function generateStaticParams() {
  const generated = await getPublishedGeneratedArticles();
  // TodayAI is AI-only: non-AI archive articles are retired (404) but their
  // source files are kept so they can be restored or exported.
  return [...CATEGORIES.flatMap(({ slug: category }) => getArticlesByCategory(category).filter((article) => classifyAiTopic(article)).map((article) => ({ category, slug: article.slug }))), ...generated.filter((article) => classifyAiTopic(article)).map((article) => ({ category: article.category, slug: article.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const validCategory = CATEGORIES.find((item) => item.slug === category)?.slug;
  if (!validCategory) return {};
  const article = getArticleBySlug(validCategory, slug) ?? await getPublishedGeneratedArticle(validCategory, slug);
  if (!article || !classifyAiTopic(article)) return {};
  return buildMetadata({ title: article.seoTitle ?? article.title, description: article.seoDescription ?? displayArticleDescription(article), path: `/${category}/${slug}`, // No width/height: real image dimensions are not stored, so none are claimed.
  ...(hasIndexableImage(article.image) ? { image: article.image, imageAlt: article.imageAlt } : {}), type: "article", publishedTime: article.date, modifiedTime: article.updated || article.date, author: resolveArticleAuthor(article).name });
}

export default async function Page({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const validCategory = CATEGORIES.find((item) => item.slug === category)?.slug;
  if (!validCategory || !getCategoryMeta(validCategory)) notFound();
  const article = getArticleBySlug(validCategory, slug) ?? await getPublishedGeneratedArticle(validCategory, slug);
  if (!article || !classifyAiTopic(article)) notFound();
  return <ArticleView article={article} />;
}
