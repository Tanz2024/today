import type { ReactNode } from "react";

/**
 * Source credit under a chart: who, licence and "as of" date, always with a link.
 * `short` is an optional compact credit shown on phones instead of the full one;
 * the full citation still appears in the page's methodology list.
 */
export default function SourceNote({ children, short }: { children: ReactNode; short?: ReactNode }) {
  return (
    <p className="rank-source">
      <span className="rank-source-full">{children}</span>
      {short ? <span className="rank-source-short">{short}</span> : null}
    </p>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
