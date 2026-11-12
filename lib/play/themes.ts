// Story themes the Play games use as collectibles. Each one maps to real
// BrisaStory coverage, so what a player collects can steer which articles
// they are shown afterwards (by topic — never by who they are).

export const THEME_IDS = ["cafe", "music", "travel", "heart", "style", "money", "campus", "games"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type Theme = {
  id: ThemeId;
  label: string;
  /** Categories whose stories fit this theme. */
  categories: readonly string[];
  /** Words that mark a story as fitting this theme. */
  terms: readonly string[];
  /** Where the collection shelf sends readers for more. */
  href: string;
};

export const THEMES: Record<ThemeId, Theme> = {
  cafe: { id: "cafe", label: "Café", categories: ["culture", "travel"], terms: ["coffee", "café", "cafe", "matcha", "food", "drink", "eat"], href: "/topics?tag=Coffee%20Culture" },
  music: { id: "music", label: "Music", categories: ["entertainment", "culture"], terms: ["music", "song", "artist", "playlist", "album"], href: "/culture" },
  travel: { id: "travel", label: "Travel", categories: ["travel"], terms: ["travel", "trip", "city", "flight", "route"], href: "/travel" },
  heart: { id: "heart", label: "Relationships", categories: ["relationships"], terms: ["dating", "relationship", "friend", "texting", "love"], href: "/relationships" },
  style: { id: "style", label: "Style", categories: ["style"], terms: ["style", "fashion", "beauty", "fragrance", "skincare"], href: "/style" },
  money: { id: "money", label: "Money", categories: ["money"], terms: ["money", "budget", "salary", "saving", "paycheck"], href: "/money" },
  campus: { id: "campus", label: "Campus & AI", categories: ["campus"], terms: ["study", "school", "university", "ai", "campus"], href: "/campus" },
  games: { id: "games", label: "Games", categories: ["gaming"], terms: ["game", "gaming", "roblox", "pokémon", "pokemon"], href: "/gaming" },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function articleMatchesTheme(article: { category: string; title: string; tags: readonly string[] }, theme: ThemeId) {
  const definition = THEMES[theme];
  // Themes owned by one desk match on category; cross-desk themes (café,
  // music) need a matching word in the title or tags.
  if (definition.categories.length === 1 && definition.categories[0] === article.category) return true;
  const text = ` ${`${article.title} ${article.tags.join(" ")}`.toLowerCase()}`;
  return definition.terms.some((term) => text.includes(` ${term}`));
}

// The theme a run collected most of, if any.
export function topTheme(collected: Partial<Record<ThemeId, number>>): ThemeId | null {
  let best: ThemeId | null = null;
  for (const id of THEME_IDS) {
    if ((collected[id] ?? 0) > 0 && (best === null || (collected[id] ?? 0) > (collected[best] ?? 0))) best = id;
  }
  return best;
}

// Deterministic theme for a spawn index, so levels look the same every play.
export function themeForIndex(index: number): ThemeId {
  return THEME_IDS[((index % THEME_IDS.length) + THEME_IDS.length) % THEME_IDS.length];
}
