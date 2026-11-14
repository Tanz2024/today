import Link from "next/link";

import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import HomepageSignals from "@/components/home/HomepageSignals";
import HomepageReturnSignal from "@/components/home/HomepageReturnSignal";
import ModelWatch from "@/components/home/ModelWatch";
import SectionHeading from "@/components/editorial/SectionHeading";
import { BandStory, EditionStory, GuideCard, LatestStory } from "@/components/editorial/Story";
import { toolAvailability } from "@/components/discovery/Cards";

import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { CATALOG_TOOLS, EVERYDAY_AI_TOOL_HREFS } from "@/lib/site-catalog";
import { getLatestModelsByMaker } from "@/lib/model-data";
import { editionHeading, planHomepage } from "@/lib/homepage-edition";
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

const siteDate = () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

/** Edition rows 2 and 3 carry a thumbnail; 4 to 6 are headline-only. */
const EDITION_THUMBNAIL_RANKS = new Set([2, 3]);

/**
 * Tools band: the featured on-device workspaces, then the everyday tools,
 * with tools that work right now ahead of ones that need setup.
 */
const HOME_TOOL_COUNT = 8;
function homepageTools(aiEnabled: boolean) {
  const featured = CATALOG_TOOLS.filter((tool) => tool.featured);
  const everyday = EVERYDAY_AI_TOOL_HREFS.flatMap((href) => CATALOG_TOOLS.filter((tool) => tool.href === href));
  const unique = [...new Map([...featured, ...everyday].map((tool) => [tool.href, tool])).values()];
  return unique
    .map((tool) => ({ tool, ready: toolAvailability(tool, aiEnabled) === "available" }))
    .sort((a, b) => Number(b.ready) - Number(a.ready))
    .slice(0, HOME_TOOL_COUNT);
}

export default async function HomePage() {
  const [all, modelSnapshot] = await Promise.all([getPublicDiscoverableArticles(), getLatestModelsByMaker()]);
  const { edition, latest, models, guides } = planHomepage(selectAiArticles(all));
  const tools = homepageTools(isAiUtilitiesEnabled());
  const newest = [...all].sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0];
  const showModels = models.length > 0 || Boolean(modelSnapshot?.models.length);

  return (
    <div className="home">
      <Container className="home-stack">
        <HomepageSignals />
        {newest ? <HomepageReturnSignal latestPublishedAt={newest.updated || newest.date} /> : null}
        <h1 className="sr-only">TodayAI — AI news, tools, games and comparisons</h1>

        {/* 1 — The numbered edition */}
        <section aria-labelledby="six-heading" data-homepage-impression="trending_impression" data-homepage-module="trending">
          <div className="edition-head">
            <p className="edition-date">{siteDate()}</p>
            <h2 id="six-heading" className="edition-heading">{editionHeading(edition.length)}</h2>
          </div>
          {edition.length ? (
            <ol className="edition-list" role="list">
              {edition.map((article, index) => <EditionStory key={article.slug} article={article} rank={index + 1} thumbnail={EDITION_THUMBNAIL_RANKS.has(index + 1)} />)}
            </ol>
          ) : (
            <div className="empty-state">
              <h3>No AI stories are published yet</h3>
              <p>New AI coverage will appear here as soon as it is published.</p>
            </div>
          )}
        </section>

        {/* 2 — Latest news */}
        {latest.length ? (
          <section aria-labelledby="latest-heading" data-homepage-impression="fresh_impression" data-homepage-module="fresh">
            <SectionHeading id="latest-heading" title="Latest news" href="/news" linkLabel="All AI news" />
            <div className="latest-grid">
              {latest.map((article) => <LatestStory key={article.slug} article={article} />)}
            </div>
          </section>
        ) : null}

        <AdSlot slot="homepage-boundary" />
      </Container>

      {/* 3 — Model launches (full-width dark band), with the live model table and the link to /compare */}
      {showModels ? (
        <section className="home-models" aria-labelledby="models-heading">
          <Container>
            <SectionHeading id="models-heading" title="Model launches" href="/news/ai-models" linkLabel="All AI model news" tone="dark" />
            {models.length ? (
              <div className="home-models-grid">
                {models.map((article) => <BandStory key={article.slug} article={article} />)}
              </div>
            ) : null}
            <ModelWatch snapshot={modelSnapshot} />
          </Container>
        </section>
      ) : null}

      <Container className="home-stack">
        {/* 4 — TodayAI's own AI tools */}
        <section aria-labelledby="tools-heading">
          <SectionHeading id="tools-heading" title="AI tools" href="/tools" linkLabel="All AI tools" />
          <p className="home-tools-lede">Free tools for writing, studying, images and audio. Most run right in your browser.</p>
          <ul className="home-tools-grid">
            {tools.map(({ tool, ready }) => (
              <li key={tool.href}>
                <Link href={tool.href} className="tool-category-tile">
                  <span className="tool-category-name">{tool.title.replace(/^AI /, "")}</span>
                  <span className="tool-category-examples">{tool.tagline ?? tool.description}</span>
                  <span className="tool-category-count">{ready ? "Use tool" : "Setup required"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* 5 — Guides, explainers and declared reviews */}
        {guides.length ? (
          <section aria-labelledby="guides-heading">
            <SectionHeading id="guides-heading" title="Guides" href="/guides" linkLabel="All guides" />
            <div className="home-learn-grid">
              {guides.map((article) => <GuideCard key={article.slug} article={article} />)}
            </div>
          </section>
        ) : null}

        {/* 6 — Newsletter */}
        <section className="home-newsletter" aria-label="Newsletter">
          <NewsletterSignup variant="homepage" />
        </section>
      </Container>
    </div>
  );
}
