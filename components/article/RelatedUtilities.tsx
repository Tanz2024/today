import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { contextualLinksFor } from "@/lib/site-catalog";

/**
 * "Try it" links to a TodayAI tool or game, shown only when the article is
 * genuinely about the same thing (matched on its title, description and tags).
 * Renders nothing for unrelated stories.
 */
export default function RelatedUtilities({ title, description, tags }: { title: string; description?: string; tags: string[] }) {
  const links = contextualLinksFor([title, description ?? "", ...tags].join(" "));
  if (!links.length) return null;
  return (
    <aside className="related-utilities" aria-labelledby="related-utilities-heading">
      <p id="related-utilities-heading" className="section-heading-kicker">Try it on TodayAI</p>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="related-utility">
              <span className="d-badge">{link.type}</span>
              <span className="related-utility-title">{link.title}</span>
              <span className="d-card-text">{link.description}</span>
              <ArrowRight size={16} aria-hidden="true" className="related-utility-arrow" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
