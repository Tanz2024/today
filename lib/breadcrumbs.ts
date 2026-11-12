import { getCategoryMeta, getPublicDeskSlug } from "./categories.ts";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

// Single source for an article's visible breadcrumb and its BreadcrumbList
// schema, so the two always agree. Hidden desks resolve to their public desk.
export function getArticleBreadcrumbs(category: string, slug: string, title: string): BreadcrumbItem[] {
  const desk = getPublicDeskSlug(category);
  return [
    { name: "Home", path: "/" },
    { name: getCategoryMeta(desk)?.name ?? desk, path: `/${desk}` },
    { name: title, path: `/${category}/${slug}` },
  ];
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: index === 0 ? "TodayAI" : item.name,
      item: item.path === "/" ? siteUrl : `${siteUrl}${item.path}`,
    })),
  };
}
