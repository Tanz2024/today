import Link from "next/link";
import Container from "@/components/ui/Container";
import { getFeaturedArticle } from "@/lib/articles";
import { permanentRedirect } from "next/navigation";
import { getTopicIndex } from "@/lib/topic-catalog";
import { getEligibleTopics, normalizeTag, topicPath } from "@/lib/topics";
import { getPublicCategories } from "@/lib/categories";
import { buildMetadata } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOPICS } from "@/lib/ai-taxonomy";

export const metadata = buildMetadata({
  title: "Topics",
    description: "Every TodayAI topic with enough stories to explore — from AI tools to study tips to digital culture.",
  path: "/topics",
});

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const topics = getEligibleTopics(await getTopicIndex());

  // Old /topics?tag=… links move to the topic's own hub.
  if (tag) {
    const match = topics.find((topic) => normalizeTag(topic.name) === normalizeTag(tag));
    if (match) permanentRedirect(topicPath(match));
  }

  const ai = selectAiArticles(await getPublicDiscoverableArticles());
  const aiCounts = new Map<string, number>();
  for (const article of ai) aiCounts.set(article.aiTopic, (aiCounts.get(article.aiTopic) ?? 0) + 1);
  const categories = getPublicCategories();
  // Each hub sits under the public desk most of its stories belong to.
  const groups = categories
    .map((category) => ({ category, topics: topics.filter((topic) => topic.desk === category.slug) }))
    .filter((group) => group.topics.length > 0);
  const grouped = new Set(groups.flatMap((group) => group.topics.map((topic) => topic.slug)));
  const other = topics.filter((topic) => !grouped.has(topic.slug));

  return (
    <Container className="flex flex-col gap-10 py-8 sm:py-12">
      <div id="all-tags">
        <PageHeader eyebrow="Topics" title="Topics" description="Browse TodayAI by AI topic, then dig into every tag and the archive desks." />
      </div>

      <section aria-labelledby="ai-topics-heading">
        <h2 id="ai-topics-heading" className="section-rule-heading">AI topics</h2>
        <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-8">
          {AI_TOPICS.map((topic) => {
            const count = aiCounts.get(topic.slug) ?? 0;
            return (
              <li key={topic.slug}>
                <Link href={`/news/${topic.slug}`} className="group block border-b border-card-border py-4">
                  <span className="flex items-baseline justify-between gap-3"><strong className="text-base font-bold tracking-tight group-hover:text-electric">{topic.name}</strong><span className="text-xs text-muted">{count} {count === 1 ? "story" : "stories"}</span></span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{topic.description}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="topic-desks-heading">
        <h2 id="topic-desks-heading" className="font-heading text-2xl font-bold tracking-[-.03em] sm:text-3xl">Archive desks</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const start = getFeaturedArticle(category.slug);
            return <div key={category.slug} className="border border-card-border p-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-electric">{category.name}</p><p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>{start && <Link href={`/${category.slug}/${start.slug}`} className="mt-4 block font-heading text-lg font-semibold leading-tight transition-colors hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric">Start with: {start.displayTitle ?? start.title} →</Link>}<Link href={`/${category.slug}`} className="mt-4 inline-flex text-sm font-semibold text-electric hover:underline">Explore desk</Link></div>;
          })}
        </div>
      </section>

      <section aria-labelledby="topic-hubs-heading" className="flex flex-col gap-8">
        <h2 id="topic-hubs-heading" className="font-heading text-sm font-bold uppercase tracking-wide text-muted">
          All topics
        </h2>
        {[...groups.map((group) => ({ label: group.category.name, topics: group.topics })), ...(other.length ? [{ label: "More topics", topics: other }] : [])].map((group) => (
          <div key={group.label}>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[.14em] text-electric">{group.label}</h3>
            <ul className="flex flex-wrap gap-2">
              {group.topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={topicPath(topic)}
                    className="inline-flex rounded-full border border-card-border px-4 py-2 text-sm font-medium text-near-black transition hover:border-electric hover:text-electric"
                  >
                    #{topic.name} <span className="ml-1 text-muted">({topic.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </Container>
  );
}
