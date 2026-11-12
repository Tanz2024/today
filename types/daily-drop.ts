export interface DailyDrop {
  id: string;
  /** ISO date (YYYY-MM-DD) in the site timezone, Asia/Kuala_Lumpur. */
  date: string;
  storyTitle: string;
  storySummary: string;
  storyHref: string;
  pollId: string;
  realQuestion: string;
  recommendationType: "song" | "place" | "activity";
  recommendationTitle: string;
  recommendationDescription: string;
  recommendationHref: string;
  /** Optional music service links for song recommendations. */
  spotifyHref?: string;
  appleMusicHref?: string;
  reactionTargetId: string;
  shareText: string;
  /** Indicates that the story itself is a neutral fallback, not newly generated today. */
  contentOrigin?: "editorial" | "fallback";
}
