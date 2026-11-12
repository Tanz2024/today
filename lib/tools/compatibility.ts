export type Dimension = "communication" | "social" | "planning" | "space" | "conflict";
export type CompatibilityQuestion = { prompt: string; dimension: Dimension; left: string; right: string };
export const COMPATIBILITY_QUESTIONS: CompatibilityQuestion[] = [
  { prompt: "When plans change, I prefer…", dimension: "planning", left: "A clear update as soon as possible", right: "Figuring it out as we go" },
  { prompt: "A good amount of checking in feels…", dimension: "communication", left: "Frequent and natural", right: "Light and unpressured" },
  { prompt: "After a busy day, I usually want…", dimension: "space", left: "Company and conversation", right: "Quiet time alone" },
  { prompt: "For a free evening, I lean toward…", dimension: "social", left: "Going somewhere together", right: "Staying in or keeping it small" },
  { prompt: "When something feels off, I prefer to…", dimension: "conflict", left: "Talk about it fairly soon", right: "Take time before talking" },
  { prompt: "A weekend plan is best when it is…", dimension: "planning", left: "Decided ahead of time", right: "Open to last-minute ideas" },
  { prompt: "Support usually means…", dimension: "communication", left: "Saying what I need out loud", right: "Showing up without many words" },
  { prompt: "My ideal social pace is…", dimension: "social", left: "A full calendar", right: "A few meaningful plans" },
  { prompt: "Personal space in a close connection is…", dimension: "space", left: "Something to name and plan", right: "Something that happens naturally" },
  { prompt: "During disagreement, I value…", dimension: "conflict", left: "Finding a next step together", right: "Keeping things calm first" },
];
export function similarity(a: number, b: number) { return Math.round(Math.max(0, 100 - Math.abs(a - b) * 25)); }
export function compatibilityScores(a: number[], b: number[]) { const dimensions = Array.from(new Set(COMPATIBILITY_QUESTIONS.map((q) => q.dimension))); const scores = Object.fromEntries(dimensions.map((dimension) => { const indexes = COMPATIBILITY_QUESTIONS.map((q, i) => q.dimension === dimension ? i : -1).filter((i) => i >= 0); return [dimension, Math.round(indexes.reduce((sum, i) => sum + similarity(a[i] ?? 3, b[i] ?? 3), 0) / indexes.length)]; })) as Record<Dimension, number>; const overall = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / dimensions.length); return { overall, dimensions: scores }; }
export function compatibilityLabel(score: number) { return score >= 85 ? "Very aligned" : score >= 70 ? "Mostly aligned" : score >= 50 ? "Mixed styles" : "Different styles"; }
