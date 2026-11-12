import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { LeadStory, TimelineStory } from "@/components/editorial/Story";
import type { AiArticle } from "@/lib/ai-content";
import { AI_TOPICS, type AiTopic } from "@/lib/ai-taxonomy";

export default function NewsFeed({ articles, allArticles, topic }: { articles: AiArticle[]; allArticles: AiArticle[]; topic?: AiTopic }) {
  const [lead, ...rest] = articles;
  const counts = new Map<string, number>();
  for (const article of allArticles) counts.set(article.aiTopic, (counts.get(article.aiTopic) ?? 0) + 1);
  const topicsWithContent = AI_TOPICS.filter((item) => counts.get(item.slug));

  return (
    <Container className="hub">
      <PageHeader
        eyebrow={topic ? "News / Topic" : "News"}
        title={topic ? topic.name : "AI news"}
        description={topic ? topic.description : "Every TodayAI story about artificial intelligence, newest first — from the tools people use every day to how AI is changing work and school."}
      />
      <nav aria-label="AI news topics" className="hub-topic-bar">
        <Link href="/news" className="topic-chip" aria-current={!topic ? "page" : undefined}>All</Link>
        {topicsWithContent.map((item) => (
          <Link key={item.slug} href={`/news/${item.slug}`} className="topic-chip" aria-current={topic?.slug === item.slug ? "page" : undefined}>
            {item.name} <span className="ml-1.5 text-xs opacity-60">{counts.get(item.slug)}</span>
          </Link>
        ))}
      </nav>

      {lead ? (
        <>
          <div className="hub-section"><LeadStory article={lead} priority /></div>
          {rest.length ? (
            <section className="hub-section" aria-labelledby="feed-heading">
              <h2 id="feed-heading" className="section-rule-heading">More {topic ? topic.name : "AI news"}</h2>
              <div>{rest.map((article) => <TimelineStory key={article.slug} article={article} />)}</div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <h2>No {topic ? topic.name : "AI"} stories yet</h2>
          <p>We haven&apos;t published anything in this topic yet. New stories appear here automatically when they go live.</p>
          <p className="empty-state-links"><Link href="/news" className="ui-link-arrow">All AI news</Link><Link href="/guides" className="ui-link-arrow">Guides</Link></p>
        </div>
      )}
    </Container>
  );
}
