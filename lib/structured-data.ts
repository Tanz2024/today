// Structured-data builders shared by every server-rendered JSON-LD block.
// Pure (no Next.js imports) so they can be tested directly.
import type { Article } from "@/types/article";

export const ORGANIZATION_AUTHOR = "TodayAI Editorial";
const COMMUNITY_PLACEHOLDER = "Community contributor";

// Raster brand mark (559×559), suitable for Google's publisher logo.
export const ORGANIZATION_LOGO = { path: "/icon.png", width: 559, height: 559 };

// No official BrisaStory social profiles are referenced anywhere in the
// project, so the Organization has no sameAs. Add real URLs here only.
export const OFFICIAL_PROFILES: string[] = [];

const FOUNDER = {
  "@type": "Person",
  "@id": "https://tanzimbinzahir.com/#person",
  name: "Tanzim Bin Zahir",
  url: "https://tanzimbinzahir.com/",
};

// JSON for an inline <script>: escape characters that could close the tag or
// break out of it, whatever an article's text contains.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Inverse of decodeName() in app/community/contributors/[name]/page.tsx,
// which turns hyphens back into spaces. Names that would not survive that
// round trip (e.g. they contain a hyphen) get no link rather than a wrong one.
export function contributorProfilePath(name: string): string | undefined {
  if (!name || name !== name.trim() || name === COMMUNITY_PLACEHOLDER || name.includes("-") || name.includes("%")) return undefined;
  const segment = name.replace(/ /g, "-");
  if (decodeURIComponent(segment).replace(/-/g, " ").trim() !== name) return undefined;
  return `/community/contributors/${encodeURIComponent(segment)}`;
}

export interface ArticleAuthor {
  name: string;
  kind: "person" | "organization";
  /** Public profile path, only when one really exists. */
  profilePath?: string;
}

// One author identity for the byline, AuthorInfo, <meta name="author"> and
// Article JSON-LD.
export function resolveArticleAuthor(article: Pick<Article, "author" | "source">): ArticleAuthor {
  const name = article.author?.trim();
  if (article.source === "community") {
    const display = name || COMMUNITY_PLACEHOLDER;
    return { name: display, kind: "person", profilePath: contributorProfilePath(display) };
  }
  if (!name || name.startsWith("TodayAI") || name.startsWith("TodayAI")) return { name: name || ORGANIZATION_AUTHOR, kind: "organization" };
  return { name, kind: "person" };
}

export function authorJsonLd(author: ArticleAuthor, siteUrl: string) {
  if (author.kind === "organization") {
    return { "@type": "Organization", name: author.name, url: `${siteUrl}/editorial-policy` };
  }
  return { "@type": "Person", name: author.name, ...(author.profilePath ? { url: `${siteUrl}${author.profilePath}` } : {}) };
}

// Only the generator's validated articleType distinguishes news; MDX has no
// type field, so it stays Article rather than being guessed from titles.
const NEWS_ARTICLE_TYPES = new Set(["reported_story"]);
export function articleSchemaType(article: Pick<Article, "articleType">): "NewsArticle" | "Article" {
  return article.articleType && NEWS_ARTICLE_TYPES.has(article.articleType) ? "NewsArticle" : "Article";
}

export function organizationJsonLd(siteUrl: string) {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "TodayAI",
    url: siteUrl,
    description: "TodayAI is an independent editorial publication covering culture, relationships, campus life, technology, travel, style, entertainment and the internet.",
    logo: { "@type": "ImageObject", url: `${siteUrl}${ORGANIZATION_LOGO.path}`, width: ORGANIZATION_LOGO.width, height: ORGANIZATION_LOGO.height },
    founder: FOUNDER,
    ...(OFFICIAL_PROFILES.length ? { sameAs: OFFICIAL_PROFILES } : {}),
  };
}

export function aboutPageJsonLd(siteUrl: string) {
  const aboutUrl = `${siteUrl}/about`;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${aboutUrl}#webpage`,
    url: aboutUrl,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": `${siteUrl}/#organization` },
  };
}

// /search reads ?q= (components/search/SearchClient.tsx), so the action is real.
export function websiteJsonLd(siteUrl: string) {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "TodayAI",
    alternateName: "Today AI",
    url: siteUrl,
    inLanguage: "en",
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface ArticleJsonLdInput {
  siteUrl: string;
  url: string;
  section: string;
  /** Absolute URL of a real article image, or undefined to omit. */
  image?: string;
}

export function articleJsonLd(article: Article, { siteUrl, url, section, image }: ArticleJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": articleSchemaType(article),
    "@id": `${url}#article`,
    headline: article.title,
    description: article.description,
    articleSection: section,
    keywords: article.tags,
    ...(image ? { image } : {}),
    url,
    inLanguage: "en",
    datePublished: article.date,
    dateModified: article.updated || article.date,
    author: authorJsonLd(resolveArticleAuthor(article), siteUrl),
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}
