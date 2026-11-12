import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/ui/Container";
import ArticleCard from "@/components/cards/ArticleCard";
import JsonLd from "@/components/seo/JsonLd";
import { getCategoryMeta } from "@/lib/categories";
import { hasIndexableImage } from "@/lib/article-discovery";
import { buildMetadata, getSiteUrl, isCategoryUiState } from "@/lib/seo";
import { getTopicIndex } from "@/lib/topic-catalog";
import { getEligibleTopics, topicPath, type Topic } from "@/lib/topics";

export const revalidate = 3600;

const PAGE_SIZE = 12;

async function findTopic(slug: string): Promise<Topic | undefined> {
  // Only hubs with enough stories exist; thin tags have no page at all.
  return getEligibleTopics(await getTopicIndex()).find((topic) => topic.slug === slug);
}

function pageNumber(page: string | undefined) {
  const value = Number.parseInt(page ?? "1", 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

// Public desks the topic's stories are listed under (Phase 2 mapping).
function deskNames(topic: Topic) {
  const names = new Set<string>();
  for (const article of topic.articles) {
    const meta = getCategoryMeta(article.category);
    if (meta && !meta.hidden) names.add(meta.name);
  }
  return [...names];
}

export async function generateStaticParams() {
  return getEligibleTopics(await getTopicIndex()).map((topic) => ({ tag: topic.slug }));
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ tag: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tag } = await params;
  const { page } = await searchParams;
  const topic = await findTopic(tag);
  if (!topic) return {};
  const newest = topic.articles[0];
  const image = topic.articles.find((article) => hasIndexableImage(article.image));
  return buildMetadata({
    title: `${topic.name} stories`,
    description: `${topic.count} TodayAI stories about ${topic.name}, newest first — starting with “${newest.displayTitle ?? newest.title}”.`,
    path: topicPath(topic),
    ...(image ? { image: image.image, imageAlt: image.imageAlt } : {}),
    noindex: isCategoryUiState(undefined, page),
  });
}

export default async function TopicPage({ params, searchParams }: { params: Promise<{ tag: string }>; searchParams: Promise<{ page?: string }> }) {
  const { tag } = await params;
  const topic = await findTopic(tag);
  if (!topic) notFound();

  const totalPages = Math.max(1, Math.ceil(topic.count / PAGE_SIZE));
  const page = pageNumber((await searchParams).page);
  if (page > totalPages) notFound();
  const articles = topic.articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const desk = getCategoryMeta(topic.desk);
  const desks = deskNames(topic);
  const siteUrl = getSiteUrl();

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${topic.name} stories`,
    url: `${siteUrl}${topicPath(topic)}`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_SIZE + index + 1,
        url: `${siteUrl}/${article.category}/${article.slug}`,
        name: article.title,
      })),
    },
  };

  return (
    <Container className="flex flex-col gap-10 py-8 sm:py-12">
      <JsonLd data={collectionLd} />
      <header className="max-w-2xl">
        <Link href="/topics" className="text-[11px] font-semibold uppercase tracking-[.14em] text-electric hover:underline">
          Topics
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">{topic.name}</h1>
        <p className="mt-3 text-muted">
          {topic.count} stories about {topic.name}, newest first
          {desks.length > 0 ? <> — from {desks.join(", ")}.</> : "."}
        </p>
      </header>

      <section aria-label={`${topic.name} stories`}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={`${article.category}/${article.slug}`} article={article} />
          ))}
        </div>
      </section>

      {totalPages > 1 && (
        <nav aria-label="Topic pages" className="flex gap-4 text-sm font-semibold">
          {page > 1 && <Link href={page === 2 ? topicPath(topic) : `${topicPath(topic)}?page=${page - 1}`} className="text-electric hover:underline">← Newer</Link>}
          {page < totalPages && <Link href={`${topicPath(topic)}?page=${page + 1}`} className="text-electric hover:underline">Older →</Link>}
        </nav>
      )}

      <nav aria-label="Keep exploring" className="flex flex-wrap gap-x-6 gap-y-2 border-t border-card-border pt-6 text-sm font-semibold">
        {desk && !desk.hidden && <Link href={`/${desk.slug}`} className="text-electric hover:underline">More from {desk.name} →</Link>}
        <Link href="/topics" className="text-electric hover:underline">All topics →</Link>
      </nav>
    </Container>
  );
}
