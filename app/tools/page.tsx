import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeading from "@/components/editorial/SectionHeading";
import JsonLd from "@/components/seo/JsonLd";
import ToolsHubAnalytics from "@/components/tools/ToolsHubAnalytics";
import FilterableGrid from "@/components/discovery/FilterableGrid";
import { CatalogToolCard, toolAvailability, toolCategoryName } from "@/components/discovery/Cards";
import { GuideCard } from "@/components/editorial/Story";
import { CATALOG_TOOLS, toolCategoriesInUse } from "@/lib/site-catalog";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "AI tools and free online utilities",
  description: "Free AI tools: remove image backgrounds, extract text from images, transcribe audio, fix grammar and ask questions about PDFs. Many run privately on your device.",
  path: "/tools",
});

export default async function ToolsPage() {
  const aiOn = isAiUtilitiesEnabled();
  const featured = CATALOG_TOOLS.filter((tool) => tool.featured);
  const guides = selectAiArticles(await getPublicDiscoverableArticles()).filter((article) => article.contentKind === "guide" || article.contentKind === "explainer").slice(0, 3);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TodayAI tools",
    itemListElement: CATALOG_TOOLS.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.title, url: new URL(tool.href, getSiteUrl()).toString() })),
  };

  return (
    <>
      <ToolsHubAnalytics />
      <JsonLd data={itemList} />
      <Container className="hub">
        <PageHeader
          title="AI tools"
          description="Free tools for writing, documents, images and audio. Most run in your browser. No account needed."
        >
          <Link href="/ai-tools" className="ui-link-arrow">Looking for AI software? Browse the directory <ArrowRight size={14} aria-hidden="true" /></Link>
        </PageHeader>

        <section aria-labelledby="featured-tools" className="hub-section">
          <SectionHeading id="featured-tools" title="Featured" />
          <ul className="card-grid tool-grid tool-grid-5">
            {featured.map((tool) => <li key={tool.href}><CatalogToolCard tool={tool} availability={toolAvailability(tool, aiOn)} /></li>)}
          </ul>
        </section>

        <section aria-labelledby="all-tools" className="hub-section">
          <SectionHeading id="all-tools" title="All tools" />
          <FilterableGrid
            label="Search tools"
            placeholder="Search tools, e.g. transcribe, pdf, grammar"
            categories={toolCategoriesInUse()}
            emptyHint={<>Try a broader word, or <Link href="/ai-tools" className="underline">browse third-party AI software</Link>.</>}
            items={CATALOG_TOOLS.map((tool) => ({
              key: tool.href,
              category: tool.category,
              text: [tool.title, tool.description, toolCategoryName(tool.category), ...(tool.keywords ?? [])].join(" "),
              node: <CatalogToolCard tool={tool} availability={toolAvailability(tool, aiOn)} />,
            }))}
          />
        </section>

        {guides.length ? (
          <section aria-labelledby="tool-guides" className="hub-section">
            <SectionHeading id="tool-guides" title="Related guides" href="/guides" linkLabel="All guides" />
            <div className="home-guides-grid">{guides.map((article) => <GuideCard key={article.slug} article={article} />)}</div>
          </section>
        ) : null}

        <p className="hub-footnote">On-device tools never upload your files. Hosted tools send your text to a model only when you press the button.</p>
      </Container>
    </>
  );
}
