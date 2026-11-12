// Shared data for the standalone Play activities (quizzes/games that live
// outside the gaming hub's own section nav) — used for "Back to Play" links
// and "Try another game" recommendations after a quiz finishes.

export type PlayActivity = { label: string; href: string; description: string };

export const PLAY_ACTIVITIES: PlayActivity[] = [
  { label: "Would You Rather", href: "/play/would-you-rather", description: "Impossible choices, no wrong answers." },
  { label: "Weekend Picker", href: "/play/weekend-picker", description: "Quick picks to land on a weekend plan." },
  { label: "Go Out or Stay Home?", href: "/play/stay-out", description: "For your social battery and your vibe." },
  { label: "Red Flag / Green Flag", href: "/play/red-flag-green-flag", description: "Call it how you see it." },
  { label: "The Group Chat", href: "/play/group-chat", description: "Better questions than \"wyd\"." },
];

export function getOtherActivities(currentHref: string, limit = 3): PlayActivity[] {
  return PLAY_ACTIVITIES.filter((activity) => activity.href !== currentHref).slice(0, limit);
}
