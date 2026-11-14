// AI Word Detective: puzzle data and scoring helpers. Pure functions, no DOM.
//
// Closeness is the cosine similarity between sentence embeddings of the guess
// and the secret word, computed in the browser by an open-source model
// (Xenova/all-MiniLM-L6-v2). Nothing here fakes a score: if the model can't
// load, the game says so and doesn't score guesses.

export const WORD_DETECTIVE_MODEL = "Xenova/all-MiniLM-L6-v2";

export type Puzzle = { word: string; hint: string };

// Common, concrete nouns so the embedding neighbourhoods are meaningful.
export const PUZZLES: Puzzle[] = [
  { word: "ocean", hint: "Nature" }, { word: "guitar", hint: "Music" }, { word: "bread", hint: "Food" },
  { word: "rocket", hint: "Space" }, { word: "library", hint: "Places" }, { word: "winter", hint: "Seasons & weather" },
  { word: "doctor", hint: "Jobs" }, { word: "camera", hint: "Technology" }, { word: "garden", hint: "Home" },
  { word: "football", hint: "Sport" }, { word: "volcano", hint: "Nature" }, { word: "coffee", hint: "Food & drink" },
  { word: "train", hint: "Transport" }, { word: "castle", hint: "Places" }, { word: "elephant", hint: "Animals" },
  { word: "umbrella", hint: "Everyday objects" }, { word: "piano", hint: "Music" }, { word: "desert", hint: "Nature" },
  { word: "keyboard", hint: "Technology" }, { word: "wedding", hint: "Events" }, { word: "pizza", hint: "Food" },
  { word: "island", hint: "Places" }, { word: "teacher", hint: "Jobs" }, { word: "thunder", hint: "Seasons & weather" },
  { word: "bicycle", hint: "Transport" }, { word: "dragon", hint: "Myth & fiction" }, { word: "museum", hint: "Places" },
  { word: "honey", hint: "Food" }, { word: "planet", hint: "Space" }, { word: "mirror", hint: "Everyday objects" },
  { word: "tiger", hint: "Animals" }, { word: "passport", hint: "Travel" }, { word: "robot", hint: "Technology" },
  { word: "forest", hint: "Nature" }, { word: "chocolate", hint: "Food" }, { word: "hospital", hint: "Places" },
  { word: "festival", hint: "Events" }, { word: "airport", hint: "Travel" }, { word: "candle", hint: "Everyday objects" },
  { word: "penguin", hint: "Animals" }, { word: "bridge", hint: "Places" }, { word: "violin", hint: "Music" },
];

const EPOCH = Date.UTC(2026, 0, 1);

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Same puzzle for everyone on a given UTC day. */
export function dailyPuzzle(date = new Date()): { puzzle: Puzzle; number: number } {
  const days = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - EPOCH) / 86_400_000);
  const index = ((days % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return { puzzle: PUZZLES[index], number: days + 1 };
}

export function randomPuzzle(exclude?: string): Puzzle {
  const pool = PUZZLES.filter((item) => item.word !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function normalizeGuess(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateGuess(guess: string, previous: string[]): string | null {
  if (!guess) return "Type a word first.";
  if (!/^[a-z][a-z' -]{0,23}$/.test(guess)) return "Use letters only (up to 24).";
  if (previous.includes(guess)) return "You already tried that one.";
  return null;
}

/** Simple plural/singular match so "oceans" solves "ocean". */
export function isSolved(guess: string, word: string) {
  return guess === word || guess === `${word}s` || guess === `${word}es` || `${guess}s` === word;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Map raw similarity to a 0–99 closeness score. MiniLM similarities between
 * unrelated single words sit around 0.1–0.3 and strongly related words around
 * 0.6–0.8, so that band is stretched across the scale. 100 is reserved for
 * the answer.
 */
export function closeness(similarity: number) {
  const scaled = (similarity - 0.18) / (0.82 - 0.18);
  return Math.max(0, Math.min(99, Math.round(scaled * 100)));
}

export function temperature(score: number): { label: string; tone: "cold" | "cool" | "warm" | "hot" | "solved" } {
  if (score >= 100) return { label: "Solved", tone: "solved" };
  if (score >= 70) return { label: "Hot", tone: "hot" };
  if (score >= 45) return { label: "Warm", tone: "warm" };
  if (score >= 25) return { label: "Cool", tone: "cool" };
  return { label: "Cold", tone: "cold" };
}

export const HINT_AFTER = { category: 8, firstLetter: 15, length: 22 } as const;
