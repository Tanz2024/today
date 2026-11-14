// Breadcrumb helpers (no category imports needed).

export interface BreadcrumbItem {
  name: string;
  path: string;
}

// Single source for an article's visible breadcrumb and its BreadcrumbList
// schema, so the two always agree. Hidden desks resolve to their public desk.
/** Home → AI Blog → AI topic → article. Legacy desk pages no longer exist. */
export function getArticleBreadcrumbs(category: string, slug: string, title: string, topic?: { slug: string; name: string }): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "AI Blog", path: "/news" },
    ...(topic ? [{ name: topic.name, path: `/news/${topic.slug}` }] : []),
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
