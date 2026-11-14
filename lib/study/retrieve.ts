// Passage chunking and retrieval for the Study assistant (and BM25 shared
// with the PDF assistant). Passages keep the page they came from; pasted
// notes have no page, and the UI never invents one.

export type Passage = { id: number; page: number | null; text: string };

const STOP = new Set("a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we were what when where which who why will with you your about would should could also may such been being not no".split(" "));
export const terms = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)?.filter((word) => !STOP.has(word)) ?? [];

/** Split page texts into ~target-character passages on sentence boundaries. */
export function toPassages(pages: { page: number | null; text: string }[], target = 900): Passage[] {
  const out: Passage[] = [];
  for (const { page, text } of pages) {
    const clean = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) continue;
    const sentences = clean.match(/[^.!?\n]+(?:[.!?]+["')\]]*|\n+|$)\s*/g) ?? [clean];
    let current = "";
    for (const sentence of sentences) {
      if (current.length + sentence.length > target && current.trim().length > target * 0.3) { out.push({ id: out.length + 1, page, text: current.trim() }); current = ""; }
      current += sentence;
      // Hard cap for text with no sentence punctuation.
      while (current.length > target * 1.6) { out.push({ id: out.length + 1, page, text: current.slice(0, target).trim() }); current = current.slice(target); }
    }
    if (current.trim()) out.push({ id: out.length + 1, page, text: current.trim() });
  }
  return out;
}

/** Notes pasted as plain text: split on blank lines into pseudo-pages without numbers. */
export function notesToPages(text: string) {
  return [{ page: null, text }];
}

/** BM25 relevance of each passage to the query (0 when no query term occurs). */
export function bm25(passageTexts: string[], query: string): number[] {
  const q = [...new Set(terms(query))];
  const docs = passageTexts.map(terms);
  const avg = docs.reduce((sum, d) => sum + d.length, 0) / Math.max(1, docs.length);
  const df = new Map(q.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  return docs.map((d) => q.reduce((sum, t) => {
    const tf = d.filter((w) => w === t).length;
    if (!tf) return sum;
    const idf = Math.log(1 + (docs.length - df.get(t)! + 0.5) / (df.get(t)! + 0.5));
    return sum + idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (d.length / avg))));
  }, 0));
}

export const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

export type Ranked = { passage: Passage; score: number; lexical: number; semantic: number | null };

/**
 * Hybrid ranking: BM25 normalised to 0–1, blended with embedding cosine
 * similarity when vectors are available.
 */
export function rank(passages: Passage[], query: string, vectors?: { passages: number[][]; query: number[] }): Ranked[] {
  const lexical = bm25(passages.map((p) => p.text), query);
  const maxLex = Math.max(...lexical, 0);
  return passages.map((passage, i) => {
    const lex = maxLex ? lexical[i] / maxLex : 0;
    const semantic = vectors ? cosine(vectors.passages[i], vectors.query) : null;
    return { passage, lexical: lexical[i], semantic, score: semantic === null ? lex : 0.45 * lex + 0.55 * Math.max(0, semantic) };
  }).sort((a, b) => b.score - a.score);
}

/** Enough evidence to try answering? Thresholds are deliberately conservative. */
export function hasEvidence(ranked: Ranked[]) {
  const top = ranked[0];
  if (!top) return false;
  if (top.semantic !== null) return top.semantic >= 0.32 || (top.lexical > 1.5 && top.semantic >= 0.2);
  return top.lexical > 1;
}

export const passageLabel = (p: Passage) => (p.page ? `p. ${p.page}` : `passage ${p.id}`);
