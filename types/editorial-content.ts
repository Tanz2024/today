export const EDITORIAL_TYPES = ["article", "music", "movie", "tv", "anime", "game", "daily_drop", "poll", "horoscope", "metro_pick", "trivia", "group_chat_question", "this_or_that", "weekly_question"] as const;
export type EditorialType = (typeof EDITORIAL_TYPES)[number];

export const EDITORIAL_STATUSES = ["candidate", "approved", "scheduled", "published", "rejected", "expired"] as const;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

export const EDITORIAL_SLOTS = ["article_draft", "homepage_curation", "on_repeat_music", "daily_song_pick", "on_screen_movie", "on_screen_tv", "on_screen_anime", "on_screen_game", "daily_drop", "pulse", "horoscope_week", "metro_pick", "daily_trivia", "group_chat_question", "this_or_that", "weekly_question"] as const;
export type EditorialSlot = (typeof EDITORIAL_SLOTS)[number];

export interface EditorialContent {
  id?: string;
  type: EditorialType;
  externalId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  destinationUrl?: string;
  source?: string;
  sourceUrl?: string;
  sourceRank?: number;
  sourceScore?: number;
  region?: string;
  genres?: string[];
  releaseDate?: string;
  discoveredAt?: string;
  brisaScore?: number;
  manualBoost?: number;
  repeatPenalty?: number;
  diversityKey?: string;
  status: EditorialStatus;
  publishAt?: string | null;
  expireAt?: string | null;
  slot: EditorialSlot;
  editionKey?: string;
  sourceProvider?: string;
  sourceRange?: string;
  sourcePeriodStart?: string;
  sourcePeriodEnd?: string;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
  sourceLastUpdated?: string;
  previousLastUpdated?: string;
  generatedAt?: string;
  displayOrder?: number;
  editorOverride?: boolean;
  editorNote?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  articleType?: string;
  contentOrigin?: "ai_researched" | "original_reporting" | "personal_story" | "editorial" | "reader_submission";
  originalReporting?: boolean;
  generatedBy?: string;
  editorialVersion?: string;
  categoryConfidence?: number;
  researchStatus?: "ready" | "insufficient" | "review";
  factCheckStatus?: "passed" | "review" | "failed";
}
