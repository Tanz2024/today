import { GameController, Newspaper, Scales, Wrench } from "@phosphor-icons/react/ssr";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/editorial/SectionHeading";
import JsonLd from "@/components/seo/JsonLd";
import { CatalogToolCard, toolAvailability, DestinationCard, GameCard } from "@/components/discovery/Cards";
import { TimelineStory } from "@/components/editorial/Story";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { CATALOG_GAMES, CATALOG_TOOLS } from "@/lib/site-catalog";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "AI hub",
  description: "Everything AI on TodayAI in one place: AI news and guides, free AI tools, AI games and factual software comparisons.",
  path: "/ai",
});

const DESTINATIONS = [
  { href: "/news", title: "AI Blog", description: "Dated news, guides and explainers.", icon: Newspaper, cta: "Read" },
  { href: "/tools", title: "AI Tools", description: "Summarize, write emails, improve prompts, explain code.", icon: Wrench, cta: "Use a tool" },
  { href: "/play", title: "AI Games", description: "Word and drawing games powered by real models.", icon: GameController, cta: "Play" },
  { href: "/compare", title: "Compare", description: "AI software side by side, by category.", icon: Scales, cta: "Compare" },
];

export default async function AiHubPage() {
  const latest = selectAiArticles(await getPublicDiscoverableArticles()).slice(0, 4);
  const aiOn = isAiUtilitiesEnabled();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TodayAI AI hub",
    url: new URL("/ai", getSiteUrl()).toString(),
    itemListElement: DESTINATIONS.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: new URL(item.href, getSiteUrl()).toString() })),
  };

  return (
    <Container className="hub">
      <JsonLd data={itemList} />
      <PageHeader eyebrow="TodayAI" title="Everything AI, in one place" description="Read what's changing, use tools that do real work, play games built on real models, and compare the software." />

      <nav aria-label="Sections" className="home-quick hub-section home-quick-4">
        {DESTINATIONS.map((item) => <DestinationCard key={item.href} {...item} />)}
      </nav>

      <section aria-labelledby="hub-tools" className="hub-section">
        <SectionHeading id="hub-tools" kicker="AI Tools" title={aiOn ? "Free AI tools" : "AI tools"} href="/tools" linkLabel="All tools" />
        <ul className="card-grid card-grid-4">{CATALOG_TOOLS.filter((tool) => tool.featured).slice(0, 4).map((tool) => <li key={tool.href}><CatalogToolCard tool={tool} availability={toolAvailability(tool, aiOn)} /></li>)}</ul>
      </section>

      <section aria-labelledby="hub-games" className="hub-section">
        <SectionHeading id="hub-games" kicker="AI Games" title="Play with AI" href="/play" linkLabel="All games" />
        <ul className="card-grid card-grid-3">{CATALOG_GAMES.map((game) => <li key={game.slug}><GameCard game={game} /></li>)}</ul>
      </section>

      {latest.length ? (
        <section aria-labelledby="hub-latest" className="hub-section">
          <SectionHeading id="hub-latest" kicker="AI Blog" title="Latest AI articles" href="/news" linkLabel="All articles" />
          <div className="home-latest-feed home-latest-narrow">{latest.map((article) => <TimelineStory key={article.slug} article={article} />)}</div>
        </section>
      ) : null}
    </Container>
  );
}
