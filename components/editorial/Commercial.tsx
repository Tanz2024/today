// Reusable, partner-agnostic commercial components. They render only what is
// passed in: nothing here invents a sponsor, price, rating or partner. Every
// paid or affiliate placement carries a visible disclosure.
import Link from "next/link";
import type { ReactNode } from "react";

export function AffiliateDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`commercial-disclosure ${className}`}>
      Some links on this page may be affiliate links. If you buy through them TodayAI may earn a commission, at no extra cost to you. This never affects what we cover or how. <Link href="/editorial-policy">Editorial policy</Link>
    </p>
  );
}

export function SponsoredLabel({ sponsor }: { sponsor: string }) {
  return <span className="sponsored-label">Sponsored · {sponsor}</span>;
}

/** Paid placement wrapper. Requires a real sponsor name. */
export function SponsoredPlacement({ sponsor, children }: { sponsor: string; children: ReactNode }) {
  return (
    <aside className="sponsored-placement" aria-label={`Sponsored by ${sponsor}`}>
      <SponsoredLabel sponsor={sponsor} />
      {children}
    </aside>
  );
}

export type ToolRecommendationProps = { name: string; url: string; description: string; affiliate?: boolean; note?: string };

export function ToolRecommendation({ name, url, description, affiliate = false, note }: ToolRecommendationProps) {
  return (
    <aside className="tool-recommendation" aria-label={`Tool: ${name}`}>
      <div>
        <p className="tool-recommendation-label">Tool mentioned</p>
        <p className="tool-recommendation-name">{name}</p>
        <p className="tool-recommendation-description">{description}</p>
        {note ? <p className="tool-recommendation-note">{note}</p> : null}
      </div>
      <a href={url} target="_blank" rel={affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"} className="ui-button ui-button-secondary inline-flex items-center">
        Visit site{affiliate ? <span className="sr-only"> (affiliate link)</span> : null}
      </a>
      {affiliate ? <p className="commercial-disclosure">Affiliate link: TodayAI may earn a commission.</p> : null}
    </aside>
  );
}

export type ComparisonColumn = { key: string; label: string };
export type ComparisonRow = { name: string; url?: string; cells: Record<string, ReactNode> };

/** Comparison table. Cells are editor-supplied; empty cells read "Not tested". */
export function ComparisonTable({ caption, columns, rows }: { caption: string; columns: ComparisonColumn[]; rows: ComparisonRow[] }) {
  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">Tool</th>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer">{row.name}</a> : row.name}</th>
              {columns.map((column) => <td key={column.key}>{row.cells[column.key] ?? <span className="text-muted">Not tested</span>}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Newsletter sponsorship slot: renders nothing without a real sponsor. */
export function NewsletterSponsor({ sponsor, message, href }: { sponsor?: string; message?: string; href?: string }) {
  if (!sponsor || !message) return null;
  return (
    <p className="newsletter-sponsor">
      <SponsoredLabel sponsor={sponsor} /> {href ? <a href={href} rel="sponsored noopener noreferrer" target="_blank">{message}</a> : message}
    </p>
  );
}
