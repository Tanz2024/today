import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import JsonLd from "@/components/seo/JsonLd";
import { AffiliateDisclosure } from "@/components/editorial/Commercial";
import { AI_TOOLS, AI_TOOL_CATEGORIES, type AiTool } from "@/lib/ai-tools";
import { buildMetadata, getSiteUrl } from "@/lib/seo";
import { formatShortDate } from "@/lib/ai-content";

export const metadata = buildMetadata({
  title: "AI tools directory",
  description: "A factual directory of AI tools for writing, coding, research, images, video, audio, productivity and education, with links to each official site.",
  path: "/ai-tools",
});

function ToolCard({ tool, index }: { tool: AiTool; index: number }) {
  return (
    <article className="directory-card">
      <div className="directory-card-head">
        <div className="directory-card-title-row"><span className="directory-card-index">{String(index + 1).padStart(2, "0")}</span><h3 className="directory-card-name">{tool.name}</h3></div>
        <span className="directory-card-maker">{tool.maker}</span>
      </div>
      <p className="directory-card-description">{tool.description}</p>
      <ul className="directory-card-uses" aria-label="Common uses">
        {tool.useCases.map((use) => <li key={use}>{use}</li>)}
      </ul>
      <dl className="directory-card-facts">
        <dt>Pricing</dt>
        <dd>{tool.pricing ?? "See official site"}</dd>
        <dt>Link checked</dt>
        <dd><time dateTime={tool.lastVerified}>{formatShortDate(tool.lastVerified)}</time></dd>
      </dl>
      {tool.relatedArticles?.length ? (
        <p className="directory-card-related">Related: {tool.relatedArticles.map((href, index) => <span key={href}>{index ? " · " : ""}<Link href={href}>{index ? "Guide" : "Read on TodayAI"}</Link></span>)}</p>
      ) : null}
      <a href={tool.url} target="_blank" rel={tool.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"} className="ui-link-arrow">
        Official site<span className="sr-only"> for {tool.name} (opens in a new tab)</span> ↗
      </a>
      {tool.affiliate ? <p className="commercial-disclosure">Affiliate link</p> : null}
    </article>
  );
}

export default function AiToolsPage() {
  const hasAffiliate = AI_TOOLS.some((tool) => tool.affiliate);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TodayAI AI tools directory",
    url: new URL("/ai-tools", getSiteUrl()).toString(),
    itemListElement: AI_TOOLS.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: tool.url })),
  };
  return (
    <Container className="hub">
      <JsonLd data={itemList} />
      <PageHeader
        eyebrow="AI Tools"
        title="AI tools directory"
        description={`${AI_TOOLS.length} AI products, sorted by what you want to get done. Descriptions are factual, nothing here is sponsored or ranked, and every link goes to the official site.`}
      >
        <Link href="/tools" className="ui-link-arrow">Looking for calculators? Practical tools →</Link>
      </PageHeader>
      <nav aria-label="AI tool categories" className="hub-topic-bar">
        {AI_TOOL_CATEGORIES.map((category) => <a key={category.slug} href={`#${category.slug}`} className="topic-chip">{category.name}</a>)}
      </nav>
      {hasAffiliate ? <AffiliateDisclosure className="mt-6" /> : null}
      {AI_TOOL_CATEGORIES.map((category) => {
        const tools = AI_TOOLS.filter((tool) => tool.category === category.slug);
        return (
          <section key={category.slug} id={category.slug} className="directory-category hub-section" aria-labelledby={`${category.slug}-heading`}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2.5">
              <h2 id={`${category.slug}-heading`} className="text-xl font-extrabold tracking-tight">{category.name}</h2>
              <p className="text-sm text-muted">{category.description}</p>
            </div>
            {tools.length ? (
            <div className="directory-grid">{tools.map((tool, index) => <ToolCard key={tool.slug} tool={tool} index={index} />)}</div>
            ) : (
              <p className="text-sm text-muted">No tools listed in this category yet.</p>
            )}
          </section>
        );
      })}
      <p className="mt-14 max-w-2xl text-sm leading-6 text-muted">
        How this directory works: we list widely available AI products with a neutral description and a link to the official site, which we check is live on the date shown. No listing is a paid placement; any affiliate or sponsored link would be clearly labelled. Pricing changes often, so we only show it once we&apos;ve checked the official pricing page. See our <Link href="/editorial-policy" className="underline">editorial policy</Link>.
      </p>
    </Container>
  );
}
