import Link from "next/link";
import type { ComponentType } from "react";
import { BookmarkSimple, ChatsCircle, Lightning, PuzzlePiece, Question, Calculator, UsersThree, Pulse } from "@phosphor-icons/react/ssr";

import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import HomepageSignals from "@/components/home/HomepageSignals";
import HomepageReturnSignal from "@/components/home/HomepageReturnSignal";
import SectionHeading from "@/components/editorial/SectionHeading";
import { GuideCard, LeadStory, RankedStory, SideStory, TimelineStory } from "@/components/editorial/Story";

import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { getCachedHomepageEngagement } from "@/lib/homepage-engagement";
import { getHomepageCurationData, resolveCuratedArticlesFromData } from "@/lib/homepage-curation";
import { selectAiArticles, type AiArticle } from "@/lib/ai-content";
import { AI_TOPICS } from "@/lib/ai-taxonomy";
import { AI_TOOLS, AI_TOOL_CATEGORIES } from "@/lib/ai-tools";
import { TOPIC_LINKS } from "@/lib/nav";
import { buildMetadata } from "@/lib/seo";

// Public content with a short freshness window; visitor-specific state
// (reactions, votes, saved stories) stays client-side.
export const revalidate = 3600;

const HOME_TITLE = "TodayAI — AI news, tools and guides";

export const metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: "AI news, a directory of AI tools, and practical guides to using AI well — explained clearly by TodayAI.",
    path: "/",
    image: "/BrisaStory.jpg",
    imageAlt: "TodayAI",
    // True size of public/BrisaStory.jpg. A 1200×630 social card does not exist yet.
    imageWidth: 1024,
    imageHeight: 559,
  }),
  // Absolute: the root title template would repeat the brand.
  title: { absolute: HOME_TITLE },
};

type Trending = { label: string; note: string; articles: AiArticle[] };

/**
 * Trending is never invented. It is, in order of preference:
 *  1. real reader engagement (reads + reactions) for AI stories, when at
 *     least two stories have any, or
 *  2. the editors' explicit "trending" curation for today, or
 *  3. stories editors flagged `featured: true`.
 * Each option is labelled honestly; with none of them the module is hidden.
 */
function chooseTrending(ai: AiArticle[], engagementScore: Map<string, number>, curated: AiArticle[] | null): Trending | null {
  const engaged = ai.filter((article) => (engagementScore.get(article.slug) ?? 0) > 0).sort((a, b) => (engagementScore.get(b.slug) ?? 0) - (engagementScore.get(a.slug) ?? 0));
  if (engaged.length >= 2) return { label: "Most read", note: "Ranked by reader reads and reactions on TodayAI.", articles: engaged.slice(0, 5) };
  if (curated && curated.length) return { label: "Editors' picks", note: "Chosen by the TodayAI editors.", articles: curated.slice(0, 5) };
  const flagged = ai.filter((article) => article.featured);
  if (flagged.length) return { label: "Editors' picks", note: "Chosen by the TodayAI editors.", articles: flagged.slice(0, 5) };
  return null;
}

const EXPLORE: { title: string; href: string; description: string; icon: ComponentType<{ size?: number; weight?: "bold" | "regular" }> }[] = [
  { title: "Games & Interactive", href: "/play", description: "Quick games, trivia and group-chat prompts.", icon: PuzzlePiece },
  { title: "Questions & Polls", href: "/questions", description: "Straight answers and reader polls.", icon: Question },
  { title: "Community", href: "/community", description: "Stories and perspectives from readers.", icon: UsersThree },
  { title: "Daily Drop", href: "/daily-drop", description: "One story, one song, one find — every day.", icon: Lightning },
  { title: "Pulse", href: "/pulse", description: "What readers are reacting to right now.", icon: Pulse },
  { title: "Practical tools", href: "/tools", description: "Calculators for budgets, grades and trips.", icon: Calculator },
  { title: "Saved stories", href: "/saved", description: "Everything you bookmarked, on this device.", icon: BookmarkSimple },
  { title: "Group chat", href: "/play/group-chat", description: "Prompts to get the conversation going.", icon: ChatsCircle },
];

const siteDate = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

export default async function HomePage() {
  const all = await getPublicDiscoverableArticles();
  const ai = selectAiArticles(all);

  const slugs = ai.map((article) => article.slug);
  const [engagementResult, curation] = await Promise.all([
    getCachedHomepageEngagement(slugs),
    getHomepageCurationData(["trending"]),
  ]);
  const engagement = engagementResult.status === "available" ? engagementResult.data : new Map();
  const engagementScore = new Map(slugs.map((slug) => [slug, engagement.get(slug)?.engagementScore ?? 0]));
  const curatedAll = resolveCuratedArticlesFromData("trending", all, curation);
  const aiBySlug = new Map(ai.map((article) => [article.slug, article]));
  const curated = curatedAll ? curatedAll.map((article) => aiBySlug.get(article.slug)).filter((article): article is AiArticle => Boolean(article)) : null;

  // Featured: an explicit homepage hero wins, otherwise the newest AI story.
  const lead = ai.find((article) => article.homepageHero) ?? ai[0];
  const supporting = ai.filter((article) => article.slug !== lead?.slug).slice(0, 2);
  const featuredSlugs = new Set([lead?.slug, ...supporting.map((article) => article.slug)]);
  const latest = ai.filter((article) => !featuredSlugs.has(article.slug)).slice(0, 8);
  const trending = chooseTrending(ai, engagementScore, curated);
  const reviews = ai.filter((article) => article.contentKind === "review" || article.contentKind === "comparison").slice(0, 4);
  const guides = ai.filter((article) => article.contentKind === "guide" || article.contentKind === "explainer").slice(0, 3);
  const activeTopics = AI_TOPICS.filter((topic) => ai.some((article) => article.aiTopic === topic.slug));
  const newest = [...all].sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0];

  return (
    <Container className="home">
      <HomepageSignals />
      {newest ? <HomepageReturnSignal latestPublishedAt={newest.updated || newest.date} /> : null}

      {/* 1 — Featured AI news */}
      <section aria-labelledby="featured-heading" data-homepage-impression="trending_impression" data-homepage-module="trending">
        <div className="home-dateline">
          <p><strong>TodayAI</strong> · {siteDate()}</p>
          {activeTopics.length ? (
            <nav aria-label="AI topics" className="home-dateline-topics">
              {activeTopics.map((topic) => <Link key={topic.slug} href={`/news/${topic.slug}`} className="topic-chip">{topic.name}</Link>)}
            </nav>
          ) : null}
        </div>
        <h2 id="featured-heading" className="sr-only">Featured AI stories</h2>
        {lead ? (
          <div className="home-featured">
            <LeadStory article={lead} priority />
            {supporting.length ? (
              <div className="home-featured-side">
                {supporting.map((article) => <SideStory key={article.slug} article={article} />)}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No AI stories are published yet</h2>
            <p>New AI coverage will appear here as soon as it is published.</p>
          </div>
        )}
      </section>

      {/* 2 + 3 — Latest AI news with Trending alongside */}
      {latest.length || trending ? (
        <section className="home-latest" aria-label="Latest and trending AI news">
          {latest.length ? (
            <div data-homepage-impression="fresh_impression" data-homepage-module="fresh">
              <SectionHeading id="latest-heading" kicker="Latest" title="Latest AI news" href="/news" linkLabel="All AI news" />
              <div className="home-latest-feed">
                {latest.map((article) => <TimelineStory key={article.slug} article={article} />)}
              </div>
            </div>
          ) : <div />}
          {trending ? (
            <aside className="home-trending" aria-labelledby="trending-heading">
              <p className="section-heading-kicker">Trending AI</p>
              <h2 id="trending-heading" className="mt-1 text-xl font-extrabold tracking-tight">{trending.label}</h2>
              <ol className="ranked-list mt-4">
                {trending.articles.map((article, index) => <RankedStory key={article.slug} article={article} rank={index + 1} />)}
              </ol>
              <p className="home-trending-note">{trending.note}</p>
            </aside>
          ) : null}
        </section>
      ) : null}

      <AdSlot slot="homepage-boundary" />

      {/* 4 — AI tools discovery */}
      <section className="home-tools" aria-labelledby="tools-heading">
        <SectionHeading id="tools-heading" kicker="Directory" title="Find the right AI tool" href="/ai-tools" linkLabel="Browse all AI tools" tone="dark" />
        <p className="home-tools-intro">{AI_TOOLS.length} AI products sorted by what you want to get done. Listings are factual and unsponsored; we link to official sites only.</p>
        <ul className="home-tools-grid">
          {AI_TOOL_CATEGORIES.map((category) => {
            const tools = AI_TOOLS.filter((tool) => tool.category === category.slug);
            return (
              <li key={category.slug}>
                <Link href={`/ai-tools#${category.slug}`} className="tool-category-tile">
                  <span className="tool-category-copy">
                    <span className="tool-category-name block">{category.name}</span>
                    <span className="tool-category-examples mt-1 block">{tools.length ? tools.map((tool) => tool.name).join(", ") : category.description}</span>
                    <span className="tool-category-count mt-3 block">{tools.length} {tools.length === 1 ? "tool" : "tools"}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 5 — Reviews & comparisons (only real, declared reviews) */}
      {reviews.length ? (
        <section aria-labelledby="reviews-heading">
          <SectionHeading id="reviews-heading" kicker="Tested" title="Reviews & comparisons" href="/reviews" linkLabel="All reviews" />
          <div className="home-guides-grid">
            {reviews.map((article) => <GuideCard key={article.slug} article={article} />)}
          </div>
        </section>
      ) : null}

      {/* 6 — Guides & tutorials */}
      {guides.length ? (
        <section aria-labelledby="guides-heading">
          <SectionHeading id="guides-heading" kicker="Learn" title="Guides & explainers" href="/guides" linkLabel="All guides" />
          <div className="home-guides-grid">
            {guides.map((article) => <GuideCard key={article.slug} article={article} />)}
          </div>
        </section>
      ) : null}

      {/* 7 — Explore TodayAI (secondary discovery) */}
      <section aria-labelledby="explore-heading" data-homepage-impression="play_impression" data-homepage-module="play">
        <SectionHeading id="explore-heading" kicker="Beyond the news" title="Explore TodayAI" href="/explore" linkLabel="Everything on Explore" />
        <ul className="explore-grid">
          {EXPLORE.map(({ title, href, description, icon: Icon }) => (
            <li key={href} className="contents">
              <Link href={href} className="explore-tile">
                <span className="explore-tile-icon"><Icon size={20} weight="bold" /></span>
                <span className="explore-tile-title">{title}</span>
                <span className="explore-tile-description">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
        <nav aria-label="TodayAI archive" className="home-archive mt-6">
          <span>From the archive:</span>
          {TOPIC_LINKS.map((link) => <Link key={link.href} href={link.href} className="topic-chip">{link.label}</Link>)}
        </nav>
      </section>

      {/* 8 — Newsletter (existing subscription backend) */}
      <section className="home-newsletter" aria-label="Newsletter">
        <NewsletterSignup variant="homepage" />
        <ul className="grid gap-3 text-sm text-muted">
          <li><strong className="text-ink">The stories that mattered</strong> — the week&apos;s AI news, briefly explained.</li>
          <li><strong className="text-ink">One practical guide</strong> — something you can actually use.</li>
          <li><strong className="text-ink">Tools worth knowing</strong> — new additions to the AI tools directory.</li>
        </ul>
      </section>
    </Container>
  );
}
