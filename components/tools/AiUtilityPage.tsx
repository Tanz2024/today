import Link from "next/link";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import AiUtilityTool from "@/components/tools/AiUtilityTool";
import { CatalogToolCard, toolAvailability } from "@/components/discovery/Cards";
import { getAiUtility, isAiUtilitiesEnabled, type AiUtilitySlug } from "@/lib/ai-utilities";
import { relatedTools } from "@/lib/site-catalog";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

/**
 * Indexing strategy: an AI utility is indexable only while it actually works
 * (provider switched on). An interface that cannot produce results is not a
 * useful search landing page, so it stays noindex until then.
 */
export function aiUtilityMetadata(slug: AiUtilitySlug) {
  const tool = getAiUtility(slug)!;
  return buildMetadata({
    title: `${tool.name} — free online tool`,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    noindex: !isAiUtilitiesEnabled(),
  });
}

export default function AiUtilityPage({ slug }: { slug: AiUtilitySlug }) {
  const tool = getAiUtility(slug)!;
  const available = isAiUtilitiesEnabled();
  const related = relatedTools(`/tools/${tool.slug}`, 3);
  const url = new URL(`/tools/${tool.slug}`, getSiteUrl()).toString();
  // Serializable subset for the client component (no server-only prompts).
  const clientTool = { slug: tool.slug, inputLabel: tool.inputLabel, placeholder: tool.placeholder, maxChars: tool.maxChars, minChars: tool.minChars, outputLabel: tool.outputLabel, actionLabel: tool.actionLabel, options: { label: tool.options.label, items: tool.options.items.map(({ value, label }) => ({ value, label, instruction: "" })) } };

  return (
    <Container className="detail-page">
      {available ? (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url, description: tool.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", isAccessibleForFree: true }} />
      ) : null}
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/tools">AI Tools</Link><span aria-hidden="true">/</span><span aria-current="page">{tool.name}</span>
      </nav>
      <header className="detail-header">
        <p className="eyebrow">AI tool · {available ? "Free" : "Coming soon"}</p>
        <h1 className="detail-title">{tool.name}</h1>
        <p className="detail-dek">{tool.description}</p>
      </header>

      <AiUtilityTool tool={clientTool} available={available} />

      <div className="detail-columns">
        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="detail-section-title">How to use it</h2>
          <ol className="detail-steps">{tool.howTo.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section aria-labelledby="uses-heading">
          <h2 id="uses-heading" className="detail-section-title">Good for</h2>
          <ul className="detail-bullets">{tool.useCases.map((use) => <li key={use}>{use}</li>)}</ul>
        </section>
      </div>

      <section aria-labelledby="privacy-heading" className="detail-note">
        <h2 id="privacy-heading" className="detail-section-title">Privacy and limits</h2>
        <p>Your text is sent to an AI model only when you press the button, and TodayAI doesn&apos;t store it. Don&apos;t paste passwords, personal data or confidential material. Inputs are limited to {tool.maxChars.toLocaleString("en-US")} characters, and there is a fair-use limit per visitor.</p>
      </section>

      <section aria-labelledby="related-tools-heading" className="detail-related">
        <h2 id="related-tools-heading" className="detail-section-title">Related tools</h2>
        <ul className="card-grid card-grid-3">{related.map((item) => <li key={item.href}><CatalogToolCard tool={item} availability={toolAvailability(item, isAiUtilitiesEnabled())} /></li>)}</ul>
      </section>

      {tool.relatedArticles.length ? (
        <section aria-labelledby="related-reading-heading" className="detail-related">
          <h2 id="related-reading-heading" className="detail-section-title">Related reading</h2>
          <ul className="link-list">{tool.relatedArticles.map((article) => <li key={article.href}><Link href={article.href}>{article.title}</Link></li>)}</ul>
        </section>
      ) : null}
    </Container>
  );
}
