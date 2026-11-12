export type Category = string;

export interface ContextualPollInput {
  question: string;
  options: string[];
}

export type ArticleVideo = {
  provider: "mux" | "direct" | "youtube" | "vimeo";
  playbackId?: string | null;
  assetId?: string | null;
  videoId?: string | null;
  sourceUrl?: string;
  streamUrl?: string;
  embedUrl?: string;
  posterUrl?: string;
  title?: string;
  caption?: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  aspectRatio?: string;
  placement?: "after-intro" | "hero";
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  status?: "processing" | "ready" | "failed" | "rejected";
};

export type GamingCategory =
  | "what-to-play"
  | "multiplayer"
  | "gaming-culture";

export interface ArticleFrontmatter {
  articleType?: string;
  /** Optional explicit AI taxonomy topic (lib/ai-taxonomy.ts AI_TOPICS slug). */
  aiTopic?: string;
  /** Optional explicit format: news | guide | explainer | review | comparison. */
  contentType?: string;
  contentOrigin?: string;
  categoryConfidence?: number;
  title: string;
  /** Short, complete headline for cards and compact surfaces. */
  displayTitle?: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  editorialLabel?: string;

  category: Category;

  tags: string[];

  date: string;
  updated?: string;

  readingTime?: string;

  image: string;
  imageAlt: string;
  imageCredit?: string;
  imageCreditUrl?: string;

  featured?: boolean;
  /** Homepage placement controls for non-technical editors. */
  homepageHero?: boolean;
  /** Homepage hero overlay opacity from 0 (none) to 1 (strongest). */
  homepageOverlayOpacity?: number;
  /** Homepage hero image brightness from 0.5 (darker) to 1.2 (lighter). */
  homepageImageBrightness?: number;
  /** Optional homepage hero presentation controls for non-technical editors. */
  homepageImageFit?: "cover" | "contain";
  homepageImagePosition?: string;
  homepageImageBorder?: boolean;
  /** Optional order for the three stories beside the homepage hero. */
  homepageSideRank?: number;
  homepageCulture?: boolean;
  homepageTravel?: boolean;
  /**
   * Trending order, for non-programmer editors.
   *
   * Set `trendingRank: 1` (2, 3, ...) to manually pin this article's
   * position in Trending — lower numbers appear first. A manual rank always
   * wins over publish date, no other field needed.
   *
   * Leave it out and Trending instead ranks by how recently the article was
   * published, then by reader reactions.
   */
  trendingRank?: number;
  /** Older "always boosted" flag — kept for existing content. Prefer
   *  `trendingRank` for new articles; it's simpler and more precise. */
  trending?: boolean;

  author?: string;

  /*
   * Optional editorial image metadata.
   *
   * Used by lib/images.ts and content/image-review.json
   * to document why an image was selected and whether
   * it needs replacement.
   */
  imageConcept?: string;
  imageKeywords?: string[];
  imageMood?: string;

  imageSourceType?:
    | "editorial"
    | "licensed"
    | "generated"
    | "fallback"
    | "pexels";

  needsImageReview?: boolean;

  /*
   * Draft articles remain in the repository but should
   * not appear in public listings, search, sitemap,
   * trending, category pages, or related content.
   *
   * Missing status means published by default.
   */
  status?: "draft" | "published";

  /*
   * Only applies when category === "gaming".
   *
   * Each gaming article should have exactly one
   * primary GamingCategory. This prevents the same
   * editorial story appearing in multiple Gaming feeds.
   */
  gamingCategory?: GamingCategory;
  games?: string[];
  primaryGame?: string;
  primaryGameImageAlt?: string;

  /*
   * Optional, hand-tagged "what do you need right now" moods for Mood Mode.
   * Only add moods that genuinely match the article's actual topic — this
   * is used to filter content, not to make new claims about it.
   */
  moods?: MoodTag[];

  /*
   * Optional Quick Read panel. Only populate when the existing article
   * content actually supports each field faithfully — do not introduce new
   * claims here that aren't already in the article body.
   */
  quickRead?: QuickRead;

  /** Optional article-specific poll, rendered from the existing poll system. */
  contextualPoll?: ContextualPollInput;

  /** Optional editor-written prompt shown above the standard reactions. */
  reactionPrompt?: string;
  /** Optional Phosphor icon overrides for the four quick reactions. */
  reactionIcons?: Partial<Record<"relatable" | "helpful" | "surprising" | "notForMe", "heart" | "thumbsUp" | "sparkle" | "xCircle" | "ghost" | "skull" | "warning" | "lightning">>;
  video?: ArticleVideo | null;
}

export type MoodTag =
  | "bored"
  | "overthinking"
  | "broke"
  | "going-out"
  | "need-advice"
  | "need-music";

export interface QuickRead {
  twentySecondAnswer: string;
  keyPoints: string[];
  whatShouldIDo?: string;
}

export type ArticleSource = "mdx" | "editorial" | "community";

export interface Article extends ArticleFrontmatter {
  /** True for automatically generated published articles from Appwrite. */
  isGenerated?: boolean;
  /** Where the article is stored. Absent means a local MDX file. */
  source?: ArticleSource;
  slug: string;
  content: string;
  readingTime: string;
}

export type ArticleCardData = Pick<Article, "slug" | "category" | "title" | "displayTitle" | "description" | "image" | "imageAlt" | "date">;

export interface CategoryMeta {
  slug: Category;

  name: string;
  description: string;

  accent: string;
  accentSoft: string;
  gradientEnd: string;

  icon: string;

  filters: string[];

  /*
   * Hidden categories remain implemented but are removed
   * from navigation, homepage, footer, and topics.
   */
  hidden?: boolean;
}

export interface ReactionCounts {
  love: number;
  laugh: number;
  cry: number;
  fire: number;
}

export type ReactionType =
  keyof ReactionCounts;
