import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import Link from "next/link";
import Container from "@/components/ui/Container";
import ToolAnalytics from "./ToolAnalytics";
import { CatalogToolCard, toolAvailability } from "@/components/discovery/Cards";
import { CATALOG_TOOLS, relatedTools } from "@/lib/site-catalog";

/** Layout for on-device tools (currently the word counter). */
export default function ToolShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const entry = CATALOG_TOOLS.find((item) => item.title === title);
  const related = entry ? relatedTools(entry.href, 3) : [];
  return (
    <>
      <ToolAnalytics tool="word-counter" />
      <Container className="detail-page">
        <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/tools">AI Tools</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
        <header className="detail-header">
          <p className="eyebrow">Utility · Runs on your device</p>
          <h1 className="detail-title">{title}</h1>
          <p className="detail-dek">{description}</p>
        </header>
        <div className="detail-tool">{children}</div>
        {related.length ? (
          <section aria-labelledby="related-tools-heading" className="detail-related">
            <h2 id="related-tools-heading" className="detail-section-title">Related tools</h2>
            <ul className="card-grid card-grid-3">{related.map((item) => <li key={item.href}><CatalogToolCard tool={item} availability={toolAvailability(item, isAiUtilitiesEnabled())} /></li>)}</ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
