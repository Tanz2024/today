import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { FeatureHero, GuideCard, TimelineStory } from "@/components/editorial/Story";
import SectionHeading from "@/components/editorial/SectionHeading";
import type { AiArticle } from "@/lib/ai-content";
import { AI_TOPICS, type AiTopic } from "@/lib/ai-taxonomy";

export default function NewsFeed({ articles, allArticles, topic }: { articles: AiArticle[]; allArticles: AiArticle[]; topic?: AiTopic }) {
  const [lead, ...rest] = articles;
  const counts = new Map<string, number>();
  for (const article of allArticles) counts.set(article.aiTopic, (counts.get(article.aiTopic) ?? 0) + 1);
  const topicsWithContent = AI_TOPICS.filter((item) => counts.get(item.slug));
  // Main blog landing only: surface guides/comparisons separately from the dated feed.
  const learn = topic ? [] : rest.filter((article) => article.contentKind !== "news").slice(0, 3);
  const learnSlugs = new Set(learn.map((article) => article.slug));
  const feed = rest.filter((article) => !learnSlugs.has(article.slug));

  return (
    <Container className="hub">
      <PageHeader
        eyebrow={topic ? "Blog / Topic" : "Blog"}
        title={topic ? topic.name : "AI news & guides"}
        description={topic ? topic.description : "Every TodayAI story about artificial intelligence, newest first — from the tools people use every day to how AI is changing work and school."}
      >
        <form action="/search" method="get" role="search" className="blog-search">
          <input type="hidden" name="type" value="stories" />
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <input id="blog-search" name="q" type="search" placeholder="Search articles" autoComplete="off" />
          <button type="submit" className="ui-button ui-button-primary">Search</button>
        </form>
        {!topic ? (
          <p className="blog-kinds">
            <Link href="/guides" className="ui-link-arrow">Guides & tutorials</Link>
            {allArticles.some((article) => article.contentKind === "review") ? <Link href="/reviews" className="ui-link-arrow">Reviews</Link> : null}
            <Link href="/compare" className="ui-link-arrow">Comparisons</Link>
          </p>
        ) : null}
      </PageHeader>
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
          <div className="hub-section"><FeatureHero article={lead} /></div>
          {learn.length ? (
            <section className="hub-section" aria-labelledby="learn-heading">
              <SectionHeading id="learn-heading" kicker="Learn" title="Guides, explainers & comparisons" href="/guides" linkLabel="All guides" />
              <div className="home-guides-grid">{learn.map((article) => <GuideCard key={article.slug} article={article} />)}</div>
            </section>
          ) : null}
          {feed.length ? (
            <section className="hub-section" aria-labelledby="feed-heading">
              <h2 id="feed-heading" className="section-rule-heading">Latest {topic ? topic.name : "AI stories"}</h2>
              <div>{feed.map((article) => <TimelineStory key={article.slug} article={article} />)}</div>
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
