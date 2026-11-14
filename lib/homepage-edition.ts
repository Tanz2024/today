// Decides which stories fill each band of the homepage. Pure and free of
// server-only imports so it can be unit-tested directly.

/** The fields of an AI article that homepage placement depends on. */
export type HomepageStory = { slug: string; aiTopic: string; contentKind: string; homepageHero?: boolean };

export type HomepagePlan<T> = { edition: T[]; latest: T[]; models: T[]; guides: T[] };

/** Stories in the numbered edition at the top of the homepage. */
export const EDITION_SIZE = 6;
const LATEST_SIZE = 6;
const MODELS_SIZE = 3;
const GUIDES_SIZE = 3;

const MODELS_TOPIC = "ai-models";

/**
 * Splits AI stories (newest first) into the homepage bands. Each story is
 * placed at most once:
 *  - edition: an editor-flagged hero if there is one, then the newest stories;
 *  - models:  newest remaining stories in the AI Models topic;
 *  - guides:  newest remaining guides, explainers, reviews and comparisons;
 *  - latest:  newest remaining news.
 */
export function planHomepage<T extends HomepageStory>(stories: T[]): HomepagePlan<T> {
  const hero = stories.find((story) => story.homepageHero) ?? stories[0];
  const edition = hero ? [hero, ...stories.filter((story) => story !== hero)].slice(0, EDITION_SIZE) : [];

  const placed = new Set(edition);
  const take = (matches: (story: T) => boolean, size: number) => {
    const picked = stories.filter((story) => !placed.has(story) && matches(story)).slice(0, size);
    for (const story of picked) placed.add(story);
    return picked;
  };

  const models = take((story) => story.aiTopic === MODELS_TOPIC, MODELS_SIZE);
  const guides = take((story) => story.contentKind !== "news", GUIDES_SIZE);
  const latest = take((story) => story.contentKind === "news", LATEST_SIZE);
  return { edition, latest, models, guides };
}

const COUNT_WORDS = ["", "", "two", "three", "four", "five", "six"];

/** Heading for the edition; names the number of stories actually shown. */
export function editionHeading(count: number) {
  const word = COUNT_WORDS[count];
  return word ? `The ${word} AI stories to read now` : count === 1 ? "The AI story to read now" : "The AI stories to read now";
}
