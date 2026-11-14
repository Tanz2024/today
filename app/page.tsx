import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";

import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import HomepageSignals from "@/components/home/HomepageSignals";
import HomepageReturnSignal from "@/components/home/HomepageReturnSignal";
import ModelWatch from "@/components/home/ModelWatch";
import HomeToolsCarousel from "@/components/home/HomeToolsCarousel";
import { LeadStory, RailStory, RiverStory } from "@/components/editorial/Story";
import { toolAvailability } from "@/components/discovery/Cards";

import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOPICS } from "@/lib/ai-taxonomy";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { CATALOG_TOOLS } from "@/lib/site-catalog";
import { getLatestModelsByMaker } from "@/lib/model-data";
import { planHomepage } from "@/lib/homepage-edition";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

const HOME_TITLE = "TodayAI — AI news, tools, games and comparisons";

export const metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: "AI news and guides, AI tools, AI games and factual AI software comparisons — in one place on TodayAI.",
    path: "/",
    // Generated TodayAI card (app/og-default.png/route.tsx).
    image: "/og-default.png",
    imageAlt: "TodayAI — AI news, tools, games and comparisons",
    imageWidth: 1200,
    imageHeight: 630,
  }),
  // Absolute: the root title template would repeat the brand.
  title: { absolute: HOME_TITLE },
};

/** Only tools that work right now, on-device workspaces first. */
function homepageTools(aiEnabled: boolean) {
  return CATALOG_TOOLS
    .filter((tool) => toolAvailability(tool, aiEnabled) === "available");
}

/** Section header: red rule, title, optional "all" link. */
function SectionHead({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="hp-head">
      <h2 id={id} className="hp-head-title">{title}</h2>
      {href && linkLabel ? <Link href={href} className="hp-head-link">{linkLabel} <ArrowRight size={13} weight="bold" aria-hidden="true" /></Link> : null}
    </div>
  );
}

export default async function HomePage() {
  const [all, modelSnapshot] = await Promise.all([getPublicDiscoverableArticles(), getLatestModelsByMaker()]);
  const { edition, latest } = planHomepage(selectAiArticles(all));
  const [lead, ...rail] = edition;
  const tools = homepageTools(isAiUtilitiesEnabled());
  const newest = [...all].sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0];
  const showModels = Boolean(modelSnapshot?.models.length);

  return (
    <div className="hp">
      <HomepageSignals />
      {newest ? <HomepageReturnSignal latestPublishedAt={newest.updated || newest.date} /> : null}
      <h1 className="sr-only">TodayAI — AI news, tools, games and comparisons</h1>

      <Container>
        {/* 1 — Top stories: lead + compact rail */}
        <section aria-labelledby="six-heading" className="hp-top" data-homepage-impression="trending_impression" data-homepage-module="trending">
          <h2 id="six-heading" className="sr-only">Top AI stories</h2>
          {lead ? (
            <div className="hp-top-grid">
              <LeadStory article={lead} />
              {rail.length ? (
                <div className="hp-rail">
                  <p className="hp-rail-label">Top stories</p>
                  {rail.map((article) => <RailStory key={article.slug} article={article} />)}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No stories yet</h3>
              <p>New coverage will appear here.</p>
            </div>
          )}
        </section>

        {/* 2 — Latest news river, with topic sidebar */}
        {latest.length ? (
          <section aria-labelledby="latest-heading" className="hp-section" data-homepage-impression="fresh_impression" data-homepage-module="fresh">
            <SectionHead id="latest-heading" title="Latest" href="/news" linkLabel="All news" />
            <div className="hp-latest">
              <div className="hp-river">
                {latest.map((article, index) => <RiverStory key={article.slug} article={article} featured={index === 0} />)}
                <Link href="/news" className="hp-more">More news <ArrowRight size={14} weight="bold" aria-hidden="true" /></Link>
              </div>
              <aside className="hp-aside" aria-label="Browse AI topics">
                <p className="hp-aside-title">Browse by topic</p>
                <ul className="hp-aside-list">
                  {AI_TOPICS.map((topic) => <li key={topic.slug}><Link href={`/news/${topic.slug}`}>{topic.name}</Link></li>)}
                </ul>
                <Link href="/compare" className="hp-aside-cta">Compare models <ArrowRight size={13} weight="bold" aria-hidden="true" /></Link>
              </aside>
            </div>
          </section>
        ) : null}

        <AdSlot slot="homepage-boundary" />

        {/* 3 — Live AI model data */}
        {showModels ? (
          <section className="hp-section hp-models" aria-labelledby="models-heading">
            <SectionHead id="models-heading" title="Models" href="/compare" linkLabel="Compare" />
            <ModelWatch snapshot={modelSnapshot} limit={5} />
          </section>
        ) : null}

        {/* 4 — Working tools, three per page */}
        {tools.length ? (
          <section aria-labelledby="tools-heading" className="hp-section">
            <SectionHead id="tools-heading" title="Free AI tools" href="/tools" linkLabel="All tools" />
            <HomeToolsCarousel tools={tools} />
          </section>
        ) : null}

        {/* 5 — Newsletter */}
        <section className="hp-newsletter" aria-label="Newsletter">
          <NewsletterSignup variant="homepage" />
        </section>
      </Container>
    </div>
  );
}
