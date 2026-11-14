import Link from "next/link";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import { CatalogToolCard, toolAvailability } from "@/components/discovery/Cards";
import { getLocalAiTool, type LocalAiToolSlug } from "@/lib/local-ai-tools";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { relatedTools } from "@/lib/site-catalog";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

/**
 * On-device tools are indexable: they work without any provider. The PDF
 * assistant needs the hosted model, so it follows the AI utilities rule and
 * stays noindex until that is switched on.
 */
export function localAiToolMetadata(slug: LocalAiToolSlug) {
  const tool = getLocalAiTool(slug);
  return buildMetadata({
    title: `${tool.name} — free, private online tool`,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    noindex: tool.processing === "hybrid" && !isAiUtilitiesEnabled(),
  });
}

export default function LocalAiToolPage({ slug, children }: { slug: LocalAiToolSlug; children: React.ReactNode }) {
  const tool = getLocalAiTool(slug);
  const aiOn = isAiUtilitiesEnabled();
  const works = tool.processing === "device" || aiOn;
  const related = relatedTools(`/tools/${tool.slug}`, 3);
  const url = new URL(`/tools/${tool.slug}`, getSiteUrl()).toString();

  return (
    <Container className="detail-page">
      {works ? <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url, description: tool.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any (modern web browser)", isAccessibleForFree: true }} /> : null}
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/tools">AI Tools</Link><span aria-hidden="true">/</span><span aria-current="page">{tool.name}</span>
      </nav>
      <header className="detail-header">
        <p className="eyebrow">AI tool · {tool.processing === "device" ? "Runs on your device" : works ? "Free" : "Setup required"}</p>
        <h1 className="detail-title">{tool.name}</h1>
        <p className="detail-dek">{tool.description}</p>
      </header>

      {children}

      <div className="detail-columns">
        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="detail-section-title">How to use it</h2>
          <ol className="detail-steps">{tool.howTo.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section aria-labelledby="uses-heading">
          <h2 id="uses-heading" className="detail-section-title">Good for</h2>
          <ul className="detail-bullets">{tool.examples.map((use) => <li key={use}>{use}</li>)}</ul>
        </section>
      </div>

      <section aria-labelledby="privacy-heading" className="detail-note">
        <h2 id="privacy-heading" className="detail-section-title">Privacy and limits</h2>
        <p>{tool.privacy}</p>
        <ul className="detail-bullets">{tool.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        <p className="text-sm text-muted">Engine: {tool.engine}. Results can contain mistakes — check anything important.</p>
      </section>

      {related.length ? (
        <section aria-labelledby="related-tools-heading" className="detail-related">
          <h2 id="related-tools-heading" className="detail-section-title">Related tools</h2>
          <ul className="card-grid card-grid-3">{related.map((item) => <li key={item.href}><CatalogToolCard tool={item} availability={toolAvailability(item, aiOn)} /></li>)}</ul>
        </section>
      ) : null}
    </Container>
  );
}
