import Link from "next/link";
import Container from "@/components/ui/Container";
import { permanentRedirect } from "next/navigation";
import { getTopicIndex } from "@/lib/topic-catalog";
import { getEligibleTopics, normalizeTag, topicPath } from "@/lib/topics";
import { buildMetadata } from "@/lib/seo";
import PageHeader from "@/components/ui/PageHeader";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOPICS } from "@/lib/ai-taxonomy";

export const metadata = buildMetadata({
  title: "AI topics",
  description: "Browse TodayAI's AI coverage by topic: AI at work, education, creative AI, safety and policy, and every tag with enough stories to explore.",
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
  return (
    <Container className="flex flex-col gap-10 py-8 sm:py-12">
      <div id="all-tags">
        <PageHeader eyebrow="Topics" title="Topics" description="Browse TodayAI's AI coverage by topic, then dig into individual tags." />
      </div>

      <section aria-labelledby="ai-topics-heading">
        <h2 id="ai-topics-heading" className="section-rule-heading">AI topics</h2>
        <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-8">
          {AI_TOPICS.filter((topic) => aiCounts.get(topic.slug)).map((topic) => {
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

      <section aria-labelledby="topic-hubs-heading" className="flex flex-col gap-8">
        <h2 id="topic-hubs-heading" className="font-heading text-sm font-bold uppercase tracking-wide text-muted">
          All topics
        </h2>
        {[{ label: "Tags", topics }].filter((group) => group.topics.length).map((group) => (
          <div key={group.label}>
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
