import Link from "next/link";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import { CatalogToolCard, toolAvailability } from "@/components/discovery/Cards";
import { getWorkspace, type WorkspaceSlug } from "@/lib/workspaces";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { relatedTools } from "@/lib/site-catalog";
import { buildMetadata, getSiteUrl } from "@/lib/seo";

export function workspaceMetadata(slug: WorkspaceSlug) {
  const workspace = getWorkspace(slug);
  return buildMetadata({ title: `${workspace.name} — free, private, on-device`, description: workspace.description, path: `/tools/${workspace.slug}` });
}

/** Shared layout for the on-device workspaces (mirrors LocalAiToolPage). */
export default function WorkspacePage({ slug, children }: { slug: WorkspaceSlug; children: React.ReactNode }) {
  const workspace = getWorkspace(slug);
  const related = relatedTools(`/tools/${workspace.slug}`, 3);
  const url = new URL(`/tools/${workspace.slug}`, getSiteUrl()).toString();
  return (
    <Container className="detail-page">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebApplication", name: workspace.name, url, description: workspace.description, applicationCategory: "UtilitiesApplication", operatingSystem: "Any (modern web browser)", isAccessibleForFree: true }} />
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/tools">AI Tools</Link><span aria-hidden="true">/</span><span aria-current="page">{workspace.name}</span>
      </nav>
      <header className="detail-header">
        <p className="eyebrow">AI workspace · Runs on your device</p>
        <h1 className="detail-title">{workspace.name}</h1>
        <p className="detail-dek">{workspace.description}</p>
      </header>

      {children}

      <div className="detail-columns">
        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="detail-section-title">How to use it</h2>
          <ol className="detail-steps">{workspace.howTo.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>
        <section aria-labelledby="uses-heading">
          <h2 id="uses-heading" className="detail-section-title">Good for</h2>
          <ul className="detail-bullets">{workspace.examples.map((use) => <li key={use}>{use}</li>)}</ul>
        </section>
      </div>

      <section aria-labelledby="privacy-heading" className="detail-note">
        <h2 id="privacy-heading" className="detail-section-title">Privacy and limits</h2>
        <p>{workspace.privacy}</p>
        <ul className="detail-bullets">{workspace.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        <p className="text-sm text-muted">Engine: {workspace.engine}. Results can contain mistakes. Check anything important.</p>
      </section>

      {related.length ? (
        <section aria-labelledby="related-tools-heading" className="detail-related">
          <h2 id="related-tools-heading" className="detail-section-title">Related tools</h2>
          <ul className="card-grid card-grid-3">{related.map((item) => <li key={item.href}><CatalogToolCard tool={item} availability={toolAvailability(item, isAiUtilitiesEnabled())} /></li>)}</ul>
        </section>
      ) : null}
    </Container>
  );
}
