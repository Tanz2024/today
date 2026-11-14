// Single source of truth for site navigation. Desktop header, mobile menu,
// footer and search read from here so labels and hrefs cannot drift.
//
// TodayAI is organised around four sections: AI Blog, AI Tools, AI Games and
// Compare. Keep dropdowns short and only link to routes that exist.
import { AI_UTILITIES } from "./ai-utilities.ts";

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
  { label: "Home", href: "/", description: "AI news, tools, games and comparisons." },
  {
    label: "AI Blog",
    href: "/news",
    description: "AI news, tutorials and guides.",
    match: ["/news", "/guides", "/reviews", "/topics"],
    // Reviews is left out until reviews are published; /reviews still exists
    // (noindex while empty) and the Compare page links to it when it has content.
    children: [
      { label: "AI News", href: "/news" },
      { label: "Guides & tutorials", href: "/guides" },
      { label: "Browse by topic", href: "/topics" },
    ],
    overview: { label: "All AI stories", href: "/news" },
  },
  {
    label: "AI Tools",
    href: "/tools",
    description: "Free AI tools for writing, documents, coding and productivity.",
    match: ["/tools", "/ai-tools"],
    children: AI_UTILITIES.map((tool) => ({ label: tool.name, href: `/tools/${tool.slug}` })),
    overview: { label: "All AI tools", href: "/tools" },
  },
  { label: "AI Games", href: "/play", description: "Word and drawing games powered by real AI models.", match: ["/play"] },
  { label: "Compare", href: "/compare", description: "AI software side by side, by category.", match: ["/compare"] },
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
