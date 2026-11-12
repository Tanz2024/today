export type HomepageEventName =
  | "question_view" | "question_vote" | "question_result_view" | "related_question_click" | "ask_question_click" | "question_recommendation_impression" | "question_recommendation_click" | "question_discovery_impression" | "question_discovery_click"
  | "question_reason_submit"
  | "homepage_view" | "daily_drop_impression" | "daily_drop_click"
  | "trending_impression" | "trending_story_click" | "story_click" | "fresh_story_click"
  | "real_question_impression" | "real_question_click" | "real_question_answer"
  | "on_repeat_impression" | "on_repeat_click" | "on_screen_impression" | "on_screen_click"
  | "travel_story_click" | "play_module_click" | "interest_selector_view"
  | "interest_selected" | "interest_removed" | "interest_reset" | "for_you_impression"
  | "for_you_click" | "newsletter_impression" | "newsletter_signup"
  | "article_entry_daily_drop" | "article_entry_trending" | "article_entry_fresh"
  | "article_entry_for_you" | "article_entry_related" | "article_entry_mid_article"
  | "article_entry_questions" | "article_entry_travel" | "article_entry_play"
  | "article_share"
  | "feedback_open" | "feedback_submit"
  | "play_hub_view" | "game_impression" | "game_start" | "game_first_action"
  | "game_pause" | "game_resume" | "game_complete" | "game_fail" | "game_replay" | "game_share" | "game_play_another"
  | "game_checkpoint" | "game_board_clear" | "game_milestone"
  | "game_article_impression" | "game_article_click"
  | "tools_hub_view" | "tool_open" | "tool_calculation_complete" | "tool_reset" | "tool_share" | "tool_article_click";

export type AnalyticsMetadata = Record<string, string | number | boolean>;

export const ARTICLE_SOURCE_KEY = "brisastory:article-source";
export const ARTICLE_SOURCE_MAX_AGE = 30 * 60 * 1000;
export type ArticleSource = "daily_drop" | "trending" | "fresh" | "for_you" | "related" | "mid_article" | "questions" | "travel" | "play";
export function captureArticleSource(storage: Pick<Storage, "setItem"> | null, sourceModule: string, slug: string, timestamp = Date.now()) { try { if (storage && sourceModule && slug) storage.setItem(ARTICLE_SOURCE_KEY, JSON.stringify({ slug, sourceModule, timestamp })); } catch { /* optional */ } }
export function readArticleSource(storage: Pick<Storage, "getItem" | "removeItem"> | null, slug: string, now = Date.now()): ArticleSource | null { try { const raw = storage?.getItem(ARTICLE_SOURCE_KEY); const value = raw ? JSON.parse(raw) as { slug?: string; sourceModule?: ArticleSource; timestamp?: number } : null; if (!value || value.slug !== slug || !value.timestamp || now - value.timestamp > ARTICLE_SOURCE_MAX_AGE) { storage?.removeItem(ARTICLE_SOURCE_KEY); return null; } storage?.removeItem(ARTICLE_SOURCE_KEY); return value.sourceModule ?? null; } catch { return null; } }

declare global { interface Window { umami?: { track: (event: string, data?: AnalyticsMetadata) => void; } } }

export function trackHomepageEvent(event: HomepageEventName, metadata?: AnalyticsMetadata) {
  if (typeof window === "undefined") return;
  try { window.umami?.track(event, metadata); } catch { /* analytics must never block navigation */ }
}

export function trackArticleShare(metadata: AnalyticsMetadata) {
  trackHomepageEvent("article_share" as HomepageEventName, metadata);
}
