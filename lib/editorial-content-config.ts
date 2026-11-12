import { EDITORIAL_SLOTS, EDITORIAL_TYPES } from "../types/editorial-content.ts";
import type { EditorialSlot, EditorialStatus, EditorialType } from "../types/editorial-content.ts";

export const EDITORIAL_TIMEZONE = "Asia/Kuala_Lumpur";
export const EDITORIAL_COLLECTION_ID = process.env.APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID ?? "editorial_content";

export const EDITORIAL_CACHE_SECONDS: Record<EditorialSlot, number> = {
  article_draft: 300,
  homepage_curation: 300,
  daily_drop: 300, pulse: 300, on_repeat_music: 1800, daily_song_pick: 300, on_screen_movie: 3600,
  on_screen_tv: 3600, on_screen_anime: 3600, on_screen_game: 3600,
  horoscope_week: 3600, metro_pick: 3600,
  daily_trivia: 300, group_chat_question: 600, this_or_that: 1800, weekly_question: 1800,
};

export const SINGLE_ITEM_SLOTS = ["daily_drop", "daily_song_pick", "pulse", "horoscope_week", "daily_trivia", "group_chat_question", "this_or_that"] as const;
export const MULTI_ITEM_SLOTS = ["on_repeat_music", "on_screen_movie", "on_screen_tv", "on_screen_anime", "on_screen_game", "metro_pick"] as const;
export function isMultiItemSlot(slot: EditorialSlot) {
  return (MULTI_ITEM_SLOTS as readonly string[]).includes(slot);
}

export const BRISA_SCORE_WEIGHTS = {
  externalPopularity: 0.3, freshness: 0.2, audienceRelevance: 0.2,
  diversity: 0.15, engagement: 0.1, manualBoost: 0.05,
} as const;

export const REPEAT_WINDOWS_DAYS: Record<EditorialType, number> = {
  article: 365,
  music: 90, movie: 60, tv: 60, anime: 60, game: 90,
  daily_drop: 365, poll: 30, horoscope: 7, metro_pick: 180,
  trivia: 30, group_chat_question: 30, this_or_that: 90, weekly_question: 365,
};

export const STATUS_TRANSITIONS: Record<EditorialStatus, readonly EditorialStatus[]> = {
  candidate: ["approved", "rejected"], approved: ["scheduled", "rejected"],
  scheduled: ["published", "rejected", "expired"], published: ["expired"],
  rejected: ["candidate", "approved"], expired: [],
};

export function isValidStatusTransition(from: EditorialStatus, to: EditorialStatus) {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

const TYPE_SLOTS: Record<EditorialType, readonly EditorialSlot[]> = {
  article: ["article_draft"],
  music: ["on_repeat_music", "daily_song_pick"], movie: ["on_screen_movie"], tv: ["on_screen_tv"],
  anime: ["on_screen_anime"], game: ["on_screen_game"], daily_drop: ["daily_drop"],
  poll: ["pulse"], horoscope: ["horoscope_week"], metro_pick: ["metro_pick"],
  trivia: ["daily_trivia"], group_chat_question: ["group_chat_question"], this_or_that: ["this_or_that"], weekly_question: ["weekly_question"],
};

export function isValidTypeSlot(type: string, slot: string) {
  return (EDITORIAL_TYPES as readonly string[]).includes(type) &&
    (EDITORIAL_SLOTS as readonly string[]).includes(slot) &&
    TYPE_SLOTS[type as EditorialType]?.includes(slot as EditorialSlot) === true;
}

export function nowInEditorialTimezone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EDITORIAL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(date).replace(", ", "T");
}

export function validateEditorialPayload(type: string, payload: unknown): string[] {
  const errors: string[] = [];
  const value = payload as Record<string, unknown> | undefined;
  if (type === "article" && (!value?.slug || !value?.bodyMarkdown || !value?.description || !value?.category)) errors.push("article payload requires slug, category, description, and bodyMarkdown");
  if (type === "trivia" && (!value?.question || !Array.isArray(value.options) || value.options.length < 2 || value.correctAnswer === undefined || !value.explanation)) errors.push("trivia payload requires question, at least two options, correctAnswer, and explanation");
  if (type === "group_chat_question" && !value?.question) errors.push("group_chat_question payload requires question");
  if (type === "this_or_that" && (!value?.left || !value.right)) errors.push("this_or_that payload requires left and right");
  if (type === "weekly_question" && (!value?.question || !value?.shortAnswer || !Array.isArray(value.reactions))) errors.push("weekly_question payload requires question, shortAnswer and reactions");
  return errors;
}
