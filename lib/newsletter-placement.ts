import { CATEGORIES } from "./categories.ts";

const ARTICLE_PATH = /^\/([a-z0-9-]+)\/[^/]+$/;

// The footer signup shows everywhere except pages that already carry a
// signup of their own (homepage, articles) and the focused story editor.
export function showFooterNewsletter(pathname: string | null): boolean {
  if (!pathname || pathname === "/" || pathname === "/community/write") return false;
  const match = pathname.match(ARTICLE_PATH);
  return !(match && CATEGORIES.some((category) => category.slug === match[1]));
}
