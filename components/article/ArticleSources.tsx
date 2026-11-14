/**
 * "Sources and links" for an article: the external links the article itself
 * cites, collected from its Markdown body. Nothing is added that the article
 * doesn't already link to. Renders nothing when there are none.
 */
export function extractExternalLinks(markdown: string, limit = 12) {
  const seen = new Set<string>();
  const links: { label: string; href: string; host: string }[] = [];
  for (const match of markdown.matchAll(/\[([^\]]{2,140})\]\((https?:\/\/[^\s)]+)\)/g)) {
    const [, label, href] = match;
    try {
      const url = new URL(href);
      const key = `${url.hostname}${url.pathname}`.replace(/\/$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ label: label.replace(/[*_`]/g, "").trim(), href: url.toString(), host: url.hostname.replace(/^www\./, "") });
    } catch { /* ignore malformed URLs */ }
    if (links.length >= limit) break;
  }
  return links;
}

export default function ArticleSources({ content }: { content: string }) {
  const links = extractExternalLinks(content);
  if (!links.length) return null;
  return (
    <section aria-labelledby="article-sources-heading" className="article-sources">
      <h2 id="article-sources-heading">Sources and links</h2>
      <ol>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
            <span>{link.host}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
