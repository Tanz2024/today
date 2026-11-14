// Deterministic study items that need no model: key-term cloze cards and
// multiple-choice questions whose options are terms from the same material.
// The correct answer is always the exact word(s) removed from a real
// sentence, so these can't be wrong about the source.

import { terms, type Passage } from "./retrieve.ts";

export type StudyCard = { id: string; q: string; a: string; passageId: number; origin: "cloze" | "ai" };
export type Mcq = { id: string; q: string; options: string[]; answer: number; passageId: number; origin: "cloze" | "ai" };

const COMMON = new Set(terms("the of and a to in is that it for on with as was by be this are or from at which an have has not but they their its were been more also can one all other than into some these such may only used use many most first two new each between both often called known example however there would when where while about during after before under over"));

/** Candidate key terms with document frequency, longest first. */
export function keyTerms(passages: Passage[]) {
  const text = passages.map((p) => p.text).join("\n");
  const counts = new Map<string, number>();
  const bump = (t: string) => counts.set(t, (counts.get(t) ?? 0) + 1);
  // Capitalised multi-word names, acronyms, hyphenated and long technical words, numbers with units.
  for (const m of text.matchAll(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|[A-Z]{2,}[a-z]?|[a-z]+-[a-z]+|[a-z]{9,}|\d+(?:\.\d+)?\s?(?:%|km|kg|m|cm|mm|°C|K|years?|million|billion))\b/g)) bump(m[0]);
  const words = terms(text);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  for (const [w, n] of freq) if (n >= 3 && w.length >= 6 && !COMMON.has(w) && !/^\d+$/.test(w)) counts.set(w, Math.max(counts.get(w) ?? 0, n));
  return [...counts.entries()].filter(([t]) => !COMMON.has(t.toLowerCase())).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([t]) => t);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function clozeCards(passages: Passage[], limit = 20): StudyCard[] {
  const keys = keyTerms(passages).slice(0, 80);
  const cards: StudyCard[] = [];
  const used = new Set<string>();
  for (const passage of passages) {
    const sentences = passage.text.match(/[^.!?\n]+[.!?]/g) ?? [];
    for (const sentence of sentences) {
      if (sentence.split(/\s+/).length < 7 || sentence.length > 260) continue;
      const key = keys.find((k) => !used.has(k.toLowerCase()) && new RegExp(`\\b${escape(k)}\\b`, k === k.toLowerCase() ? "i" : "").test(sentence));
      if (!key) continue;
      used.add(key.toLowerCase());
      cards.push({ id: `c${passage.id}-${cards.length}`, q: sentence.trim().replace(new RegExp(`\\b${escape(key)}\\b`, key === key.toLowerCase() ? "i" : ""), "_____"), a: key, passageId: passage.id, origin: "cloze" });
      if (cards.length >= limit) return cards;
    }
  }
  return cards;
}

/** Deterministic shuffle so a quiz is stable for the same material. */
function seeded(seed: number) {
  let s = seed || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

const kindOf = (t: string) => (/\d/.test(t) ? "number" : t.includes(" ") ? "phrase" : /^[A-Z]/.test(t) ? "name" : "word");

/** Turn cards into MCQs with distractors drawn from the same material. */
export function toMcqs(cards: StudyCard[], pool: string[], seed = 7): Mcq[] {
  const random = seeded(seed);
  const out: Mcq[] = [];
  for (const card of cards) {
    const answer = card.a.trim();
    // Long answers stand out next to short distractors; keep those as flashcards only.
    if (answer.split(/\s+/).length > 5) continue;
    const lower = answer.toLowerCase();
    const candidates = [...new Set([...cards.map((c) => c.a.trim()), ...pool])]
      .filter((t) => t.toLowerCase() !== lower && !lower.includes(t.toLowerCase()) && !t.toLowerCase().includes(lower) && !card.q.toLowerCase().includes(t.toLowerCase()));
    const same = candidates.filter((t) => kindOf(t) === kindOf(answer));
    const picked = [...same, ...candidates.filter((t) => !same.includes(t))].slice(0, 12).sort(() => random() - 0.5).slice(0, 3);
    if (picked.length < 3) continue;
    const options = [...picked, answer].sort(() => random() - 0.5);
    out.push({ id: `m-${card.id}`, q: card.q, options, answer: options.indexOf(answer), passageId: card.passageId, origin: card.origin });
  }
  return out;
}

/** Deterministic marking of a typed answer against the reference. */
export function markShortAnswer(answer: string, reference: string): "correct" | "partly" | "incorrect" {
  const want = new Set(terms(reference));
  const got = new Set(terms(answer));
  if (!want.size) return answer.trim().toLowerCase() === reference.trim().toLowerCase() ? "correct" : "incorrect";
  const hit = [...want].filter((w) => got.has(w) || [...got].some((g) => g.length > 4 && (g.startsWith(w.slice(0, -1)) || w.startsWith(g.slice(0, -1))))).length / want.size;
  return hit >= 0.8 ? "correct" : hit >= 0.4 ? "partly" : "incorrect";
}
