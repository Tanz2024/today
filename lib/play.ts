const RECENT_KEY = "freshscene:play:recent-this-or-that";
const RECENT_LIMIT = 40;

export function shuffleQuestions<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getRecentlySeen(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; } catch { return []; }
}

export function rememberSeenQuestions(ids: string[]) {
  if (typeof window === "undefined") return;
  const next = [...new Set([...getRecentlySeen(), ...ids])].slice(-RECENT_LIMIT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function getNewQuestionSet<T extends { id: string }>(items: T[], count: number): T[] {
  const recent = new Set(getRecentlySeen());
  const unseen = shuffleQuestions(items.filter((item) => !recent.has(item.id)));
  const fallback = shuffleQuestions(items.filter((item) => recent.has(item.id)));
  return [...unseen, ...fallback].slice(0, Math.min(count, items.length));
}

export const PATHS = {
  wanderer: ["THE WANDERER", "Curious enough to go. Independent enough to go alone."],
  homebase: ["THE HOMEBASE", "Selective with your energy—and very good at knowing when staying in is the better plan."],
  connector: ["THE CONNECTOR", "People, conversations and shared experiences tend to win your vote."],
  nightOwl: ["THE NIGHT OWL", "You keep choosing the option that starts after everyone else should probably be asleep."],
  planner: ["THE PLANNER", "Spontaneous enough to have fun. Organized enough to know where the hotel is."],
  softAdventure: ["THE SOFT ADVENTURER", "You want the trip, the story and the experience—just preferably with a good bed afterward."],
  mainCharacter: ["THE MAIN CHARACTER", "You are choosing the story you will remember later."],
  observer: ["THE OBSERVER", "You take your time, notice what others miss and rarely choose something just because everyone else does."],
} as const;
