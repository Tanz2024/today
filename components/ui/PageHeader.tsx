import type { ReactNode } from "react";

/** Consistent page heading for hubs (News, AI Tools, Guides, Explore...). */
export default function PageHeader({ eyebrow, title, description, children, as: Tag = "h1" }: { eyebrow?: string; title: string; description?: string; children?: ReactNode; as?: "h1" | "h2" }) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="page-header-eyebrow">{eyebrow}</p> : null}
      <Tag className="page-header-title">{title}</Tag>
      {description ? <p className="page-header-description">{description}</p> : null}
      {children ? <div className="page-header-actions">{children}</div> : null}
    </header>
  );
}
