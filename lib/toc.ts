export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split("\n");
  const items: TocItem[] = [];

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) {
      items.push({ id: slugify(h2[1]), text: h2[1].trim(), level: 2 });
    } else if (h3) {
      items.push({ id: slugify(h3[1]), text: h3[1].trim(), level: 3 });
    }
  }

  return items;
}
