import type { Metadata } from "next";
import { IS_STAGING } from "./deployment.ts";

export const SITE_NAME = "TodayAI";
export const SITE_TAGLINE = "AI news, tools, games and comparisons";
import { SITE_URL } from "./site-url.ts";

export { SITE_URL };

/** Public origin from NEXT_PUBLIC_SITE_URL (see lib/site-url.ts). */
export function getSiteUrl(): string {
  return SITE_URL;
}

interface PageMetaOptions {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  /** Emit `noindex, follow` and drop the canonical (filtered/paginated/private views). */
  noindex?: boolean;
}

// Feed discovery. Next.js replaces a parent's `alternates` wholesale, so every
// page that sets its own canonical must repeat this to keep the feed link.
export const FEED_ALTERNATES = {
  types: { "application/rss+xml": [{ url: "/feed.xml", title: "TodayAI" }] },
};

// Indexable pages opt into large image previews, which Google Discover needs
// to show the large-card format.
const PUBLIC_INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  "max-image-preview": "large",
  googleBot: { index: true, follow: true, "max-image-preview": "large" },
} satisfies Metadata["robots"];

export const NOINDEX_ROBOTS = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
} satisfies Metadata["robots"];

// Staging must never compete with the live site in search. The canonical URL
// intentionally remains the production domain until an official migration.
export const INDEXABLE_ROBOTS = IS_STAGING ? NOINDEX_ROBOTS : PUBLIC_INDEXABLE_ROBOTS;

// True when a category listing is showing a filter or a page beyond the first.
export function isCategoryUiState(filter?: string, page?: string): boolean {
  const pageNumber = Number.parseInt(page ?? "1", 10);
  return Boolean(filter) || (Number.isFinite(pageNumber) && pageNumber > 1);
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  noindex = false,
}: PageMetaOptions): Metadata {
  const url = new URL(path, getSiteUrl()).toString();
  const ogImage = image
    ? [
        {
          url: new URL(image, getSiteUrl()).toString(),
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt ?? title,
        },
      ]
    : undefined;

  return {
    title,
    description,
    // A noindex view must not claim a canonical: pointing it at another URL
    // would be misleading, and a self-canonical contradicts the noindex.
    alternates: noindex ? FEED_ALTERNATES : { ...FEED_ALTERNATES, canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: ogImage,
      ...(type === "article" && publishedTime ? { publishedTime, modifiedTime: modifiedTime ?? publishedTime } : {}),
    },
    ...(author ? { authors: [{ name: author }] } : {}),
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image
        ? [
            {
              url: new URL(image, getSiteUrl()).toString(),
              alt: imageAlt ?? title,
            },
          ]
        : undefined,
    },
    robots: noindex ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS,
  };
}
