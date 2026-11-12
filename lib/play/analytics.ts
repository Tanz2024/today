// Play analytics on top of the existing Simple Analytics wrapper. Only
// lifecycle moments are sent — never frames, movements, jumps or collisions.
import { trackHomepageEvent, type AnalyticsMetadata, type HomepageEventName } from "../homepage-analytics.ts";
import type { GameType } from "./storage.ts";

export type DurationBucket = "<30s" | "30-60s" | "1-3m" | "3m+";

export function durationBucket(ms: number): DurationBucket {
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 30) return "<30s";
  if (seconds < 60) return "30-60s";
  if (seconds < 180) return "1-3m";
  return "3m+";
}

export function scoreBucket(score: number): string {
  if (score <= 0) return "0";
  if (score < 100) return "1-99";
  if (score < 500) return "100-499";
  if (score < 2000) return "500-1999";
  return "2000+";
}

type Track = (event: HomepageEventName, metadata?: AnalyticsMetadata) => void;

export type PlaySession = ReturnType<typeof createPlaySession>;

// One session per mounted game. Impressions and first actions are
// de-duplicated so re-renders or repeated taps cannot inflate counts.
export function createPlaySession(game: GameType, track: Track = trackHomepageEvent, now: () => number = Date.now) {
  let impressed = false;
  let runStartedAt = 0;
  let runActive = false;
  let firstActionSent = false;
  let articleImpressionSent = false;
  const base = { game_type: game };

  function runProps(extra: AnalyticsMetadata = {}): AnalyticsMetadata {
    return { ...base, duration_bucket: durationBucket(runActive ? now() - runStartedAt : 0), ...extra };
  }

  return {
    impression() {
      if (impressed) return;
      impressed = true;
      track("game_impression", base);
    },
    start() {
      runStartedAt = now();
      runActive = true;
      firstActionSent = false;
      articleImpressionSent = false;
      track("game_start", base);
    },
    firstAction() {
      if (firstActionSent || !runActive) return;
      firstActionSent = true;
      track("game_first_action", base);
    },
    pause() { track("game_pause", base); },
    resume() { track("game_resume", base); },
    complete(extra: AnalyticsMetadata = {}) { track("game_complete", runProps(extra)); },
    fail(extra: AnalyticsMetadata = {}) { track("game_fail", runProps(extra)); },
    replay() { track("game_replay", base); },
    share(method: "native" | "copy") { track("game_share", { ...base, method }); },
    checkpoint(value: number) { track("game_checkpoint", { ...base, checkpoint: value }); },
    boardClear(board: number) { track("game_board_clear", { ...base, board }); },
    milestone(distance: number) { track("game_milestone", { ...base, distance }); },
    articleImpression(slugs: readonly string[]) {
      if (articleImpressionSent || slugs.length === 0) return;
      articleImpressionSent = true;
      track("game_article_impression", { ...base, articles: slugs.join(","), count: slugs.length });
    },
    articleClick(slug: string, position: number) { track("game_article_click", { ...base, article: slug, position }); },
    playAnother(target: GameType) { track("game_play_another", { ...base, target }); },
  };
}
