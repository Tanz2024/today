import type { ReactNode } from "react";

/** Source credit under a chart: who, licence and "as of" date, always with a link. */
export default function SourceNote({ children }: { children: ReactNode }) {
  return <p className="compare-data-note rank-source">{children}</p>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
