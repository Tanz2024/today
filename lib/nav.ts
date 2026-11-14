// Single source of truth for site navigation. Desktop header, mobile menu,
// footer and search read from here so labels and hrefs cannot drift.
//
// TodayAI is organised around four sections: AI Blog, AI Tools, AI Games and
// Compare. Keep dropdowns short and only link to routes that exist.

export type NavLink = { label: string; href: string };
export type NavItem = NavLink & {
  description: string;
  /** Path prefixes that mark this item active (besides href itself). */
  match?: string[];
  children?: NavLink[];
  /** Shown as the last link of a dropdown. */
  overview?: NavLink;
};

export const SEARCH_LINK: NavLink = { label: "Search", href: "/search" };

export const PRIMARY_NAV: NavItem[] = [
  {
    label: "News",
    href: "/news",
    description: "The latest AI news, launches and analysis.",
    match: ["/news", "/topics"],
    children: [
      { label: "Latest AI news", href: "/news" },
      { label: "AI companies", href: "/news/ai-companies" },
      { label: "Product releases", href: "/news/product-releases" },
      { label: "Browse by topic", href: "/topics" },
    ],
    overview: { label: "All AI news", href: "/news" },
  },
  {
    label: "AI Models",
    href: "/compare",
    description: "New model launches, prices and side-by-side comparisons.",
    match: ["/compare", "/news/ai-models"],
    children: [
      { label: "Model launches", href: "/news/ai-models" },
      { label: "Compare AI models", href: "/compare" },
    ],
    overview: { label: "Compare models", href: "/compare" },
  },
  {
    label: "AI Tools",
    href: "/tools",
    description: "Free AI tools for writing, documents, images and study. Many run on your device.",
    match: ["/tools", "/ai-tools"],
    children: [
      { label: "Writing & Paraphrasing Studio", href: "/tools/ai-writing-studio" },
      { label: "Resume & Job Assistant", href: "/tools/ai-resume-assistant" },
      { label: "Image & Document Studio", href: "/tools/ai-image-document-studio" },
      { label: "Study & Exam Assistant", href: "/tools/ai-study-assistant" },
      { label: "AI software directory", href: "/ai-tools" },
    ],
    overview: { label: "All AI tools", href: "/tools" },
  },
  { label: "Guides", href: "/guides", description: "Tutorials and explainers for using AI well.", match: ["/guides", "/reviews"] },
  { label: "AI Games", href: "/play", description: "Word and drawing games powered by real AI models.", match: ["/play"] },
];

/** True when `pathname` belongs to the nav item (used for active indicators). */
export function isNavItemActive(item: Pick<NavItem, "href" | "match">, pathname: string | null | undefined) {
  if (!pathname) return false;
  if (item.href === "/") return pathname === "/";
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// ── Footer groups ────────────────────────────────────────────────
export const FOOTER_EDITORIAL: NavLink[] = [
  { label: "AI Blog", href: "/news" },
  { label: "Guides", href: "/guides" },
  { label: "Compare", href: "/compare" },
];
export const FOOTER_DISCOVER: NavLink[] = [
  { label: "AI Tools", href: "/tools" },
  { label: "AI Games", href: "/play" },
  { label: "AI software directory", href: "/ai-tools" },
];
export const COMPANY_LINKS: NavLink[] = [
  { label: "About", href: "/about" },
  { label: "Editorial Policy", href: "/editorial-policy" },
  { label: "Contact", href: "/contact" },
];
export const LEGAL_LINKS: NavLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Advertising & affiliate disclosure", href: "/editorial-policy#advertising" },
];

// One-line descriptions keyed by href (used by search's destination list).
export const NAV_DESCRIPTIONS: Record<string, string> = Object.fromEntries(PRIMARY_NAV.map((item) => [item.href, item.description]));
