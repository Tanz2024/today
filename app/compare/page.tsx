import Link from "next/link";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { AI_TOOLS, AI_TOOL_CATEGORIES } from "@/lib/ai-tools";
import { buildMetadata, getSiteUrl } from "@/lib/seo";
import { getLatestModelsByMaker } from "@/lib/model-data";
import ModelInfographic from "@/components/compare/ModelInfographic";
import ModelComparison from "@/components/compare/ModelComparison";
import { GuideCard } from "@/components/editorial/Story";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Compare AI models and software",
  description: "Understand AI models, capabilities, API pricing and software categories using sourced data and clear methodology.",
  path: "/compare",
});

export default async function ComparePage() {
  const [articles, modelSnapshot] = await Promise.all([getPublicDiscoverableArticles(), getLatestModelsByMaker()]);
  const ai = selectAiArticles(articles);
  const comparisons = ai.filter((article) => article.contentKind === "comparison");
  const softwareGroups = AI_TOOL_CATEGORIES.map((category) => ({ category, tools: AI_TOOLS.filter((tool) => tool.category === category.slug) })).filter((group) => group.tools.length);

  return (
    <Container className="hub compare-page">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Compare AI models and software", url: new URL("/compare", getSiteUrl()).toString(), description: "Sourced comparisons of AI models, API pricing, capabilities and software." }} />
      <header className="compare-intro" id="overview">
        <p className="page-header-eyebrow">Research / Compare</p>
        <h1 className="page-header-title">Compare AI</h1>
        <p className="page-header-description">Understand models, capabilities and costs. TodayAI separates API model facts from consumer software, and labels what the available data can—and cannot—tell us.</p>
      </header>
      <nav aria-label="Compare sections" className="compare-tabs"><a href="#overview" aria-current="page">Overview</a><a href="#models">Models</a><a href="#pricing">Pricing</a><a href="#trends">Trends</a><a href="#software">Software</a></nav>

      <section id="models" className="compare-section" aria-labelledby="models-heading">
        <div className="compare-section-heading"><div><p className="section-heading-kicker">Model metadata</p><h2 id="models-heading">What each model supports</h2></div><span className="compare-section-meta">OpenRouter API · hourly cache</span></div>
        {modelSnapshot ? <ModelComparison snapshot={modelSnapshot} /> : <p className="compare-empty">Model metadata is unavailable. <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">View OpenRouter models</a>.</p>}
      </section>

      <section id="pricing" className="compare-section" aria-labelledby="pricing-heading">
        <div className="compare-section-heading"><div><p className="section-heading-kicker">API economics</p><h2 id="pricing-heading">Which models cost less to run?</h2></div><span className="compare-section-meta">USD per 1M tokens</span></div>
        {modelSnapshot ? <ModelInfographic snapshot={modelSnapshot} /> : <p className="compare-empty">Pricing data is unavailable until the source can be reached.</p>}
      </section>

      <section id="trends" className="compare-section compare-unavailable" aria-labelledby="trends-heading">
        <p className="section-heading-kicker">Usage and performance</p>
        <h2 id="trends-heading">Trends are not shown without historical data</h2>
        <p>OpenRouter’s public rankings describe tokens processed through OpenRouter, not global market share. TodayAI does not invent a 7-, 30- or 90-day series from a current snapshot, and Artificial Analysis does not provide a public API for its benchmark data.</p>
        <div className="compare-source-links"><a href="https://openrouter.ai/rankings" target="_blank" rel="noopener noreferrer">OpenRouter usage rankings ↗</a><a href="https://artificialanalysis.ai/models" target="_blank" rel="noopener noreferrer">Artificial Analysis model research ↗</a></div>
      </section>

      <section id="software" className="compare-section" aria-labelledby="software-heading">
        <div className="compare-section-heading"><div><p className="section-heading-kicker">Consumer products</p><h2 id="software-heading">AI software directory</h2></div><Link href="/ai-tools" className="ui-link-arrow">Full directory →</Link></div>
        {softwareGroups.map(({ category, tools }) => <section key={category.slug} className="software-group" aria-labelledby={`software-${category.slug}`}><h3 id={`software-${category.slug}`}>{category.name.replace(/^AI /, "")}</h3><div className="software-table-wrap"><table className="software-table"><caption className="sr-only">{category.name} products</caption><thead><tr><th scope="col">Product</th><th scope="col">Company</th><th scope="col">Use case</th><th scope="col">Pricing</th><th scope="col"><span className="sr-only">Official site</span></th></tr></thead><tbody>{tools.map((tool) => <tr key={tool.slug}><th scope="row"><a href={tool.url} target="_blank" rel={tool.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"}>{tool.name}</a></th><td data-label="Company">{tool.maker}</td><td data-label="Use case">{tool.description}</td><td data-label="Pricing">{tool.pricing ?? "Not verified"}</td><td data-label="Link"><a href={tool.url} target="_blank" rel="noopener noreferrer">Official site ↗</a></td></tr>)}</tbody></table></div></section>)}
      </section>

      {comparisons.length ? <section className="compare-section" aria-labelledby="published-heading"><div className="compare-section-heading"><div><p className="section-heading-kicker">TodayAI editorial</p><h2 id="published-heading">Published comparisons</h2></div></div><div className="home-guides-grid">{comparisons.map((article) => <GuideCard key={article.slug} article={article} />)}</div></section> : null}
      <footer className="compare-methodology"><strong>Methodology</strong><p>OpenRouter supplies model identifiers, listed dates, context windows, modalities and API prices. Those values are cached and timestamped. Usage through OpenRouter is not global market share; API price is not a subscription price; context length is not a quality score. See the <Link href="/editorial-policy">editorial policy</Link>.</p></footer>
    </Container>
  );
}
