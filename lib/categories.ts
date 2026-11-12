// Keep this import relative so the Node test runner can load the category
// configuration without needing Next.js path-alias resolution.
import categoryConfig from "../content/categories.json" with { type: "json" };
import type { CategoryMeta } from "@/types/article";

// Editorial category configuration lives in content/categories.json so it can
// be edited without changing application code.
export const CATEGORIES = categoryConfig as CategoryMeta[];

export function getCategoryMeta(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function getPublicCategories(): CategoryMeta[] {
  return CATEGORIES.filter((category) => !category.hidden);
}

// Hidden desks keep their URLs, but their stories are listed on the public
// category readers actually browse. Mirrors the aliases applied to generated
// articles in lib/generated-articles.ts.
const LISTED_UNDER: Record<string, string> = {
  entertainment: "culture",
  gaming: "culture",
  "self-care": "relationships",
};

// Public desk each hidden desk's articles belong to, for breadcrumbs and
// landing-page redirects. Mirrors LISTED_UNDER plus the existing /food and
// /social redirects in next.config.ts. `gaming` is absent on purpose: /gaming
// is served by its own public hub (app/gaming/page.tsx), not the hidden
// category template.
export const PUBLIC_DESK_FOR_HIDDEN: Record<string, string> = {
  ...LISTED_UNDER,
  food: "travel",
  social: "culture",
};
delete PUBLIC_DESK_FOR_HIDDEN.gaming;

// The public desk a category's readers should be sent to.
export function getPublicDeskSlug(slug: string): string {
  return PUBLIC_DESK_FOR_HIDDEN[slug] ?? slug;
}

// The category itself plus any hidden desks whose stories it lists.
export function getListingCategories(slug: string): string[] {
  return [slug, ...Object.keys(LISTED_UNDER).filter((hidden) => LISTED_UNDER[hidden] === slug)];
}
