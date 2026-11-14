// Rule-based writing checks that work with no model at all. Each issue has
// an exact character range; `fix` is offered only when the correction is
// unambiguous.

export type LintIssue = { start: number; end: number; message: string; fix?: string; rule: string };

const MISSPELLINGS: Record<string, string> = {
  teh: "the", recieve: "receive", recieved: "received", seperate: "separate", definately: "definitely", occured: "occurred", untill: "until", wich: "which", accomodate: "accommodate", alot: "a lot", libary: "library", goverment: "government", enviroment: "environment", tommorow: "tomorrow", tommorrow: "tomorrow", begining: "beginning", beleive: "believe", calender: "calendar", existance: "existence", freind: "friend", independant: "independent", neccessary: "necessary", necesary: "necessary", occassion: "occasion", publically: "publicly", refered: "referred", relevent: "relevant", succesful: "successful", sucessful: "successful", truely: "truly", wierd: "weird", acheive: "achieve", arguement: "argument", basicly: "basically", buisness: "business", commited: "committed", concious: "conscious", embarass: "embarrass", foriegn: "foreign", fourty: "forty", grammer: "grammar", happend: "happened", immediatly: "immediately", knowlege: "knowledge", maintainance: "maintenance", noticable: "noticeable", occurence: "occurrence", persue: "pursue", posession: "possession", prefered: "preferred", recomend: "recommend", reccomend: "recommend", responsability: "responsibility", rythm: "rhythm", tounge: "tongue", thier: "their", wether: "whether", writting: "writing", experiance: "experience", managment: "management", developement: "development", analysys: "analysis",
};

const CONTRACTIONS: Record<string, string> = { dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", wasnt: "wasn't", arent: "aren't", werent: "weren't", couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't", im: "I'm", ive: "I've", youre: "you're", theyre: "they're", thats: "that's", whats: "what's", lets: "let's" };
// "lets" and "thats" are only fixed at the start of a clause, where they're unambiguous.
const CLAUSE_ONLY = new Set(["lets"]);

const MODAL_OF = /\b(could|should|would|must|might)\s+of\b/gi;

function caseLike(source: string, word: string) {
  return source[0] === source[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word;
}

export function lintText(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (issue: LintIssue) => { if (!issues.some((i) => i.start < issue.end && issue.start < i.end)) issues.push(issue); };

  for (const m of text.matchAll(/\b([\p{L}]+)\s+(\1)\b/giu)) {
    if (m[1].toLowerCase() === "that" || m[1].toLowerCase() === "had") continue; // often correct
    add({ start: m.index!, end: m.index! + m[0].length, message: `Repeated word “${m[1]}”`, fix: m[1], rule: "repeat" });
  }
  for (const m of text.matchAll(/\b[\p{L}]+\b/gu)) {
    const right = MISSPELLINGS[m[0].toLowerCase()];
    if (right) add({ start: m.index!, end: m.index! + m[0].length, message: `Possible misspelling of “${right}”`, fix: caseLike(m[0], right), rule: "spelling" });
  }
  for (const m of text.matchAll(/\b[\p{L}]+\b/gu)) {
    const lower = m[0].toLowerCase();
    const right = CONTRACTIONS[lower];
    if (!right) continue;
    if (CLAUSE_ONLY.has(lower) && !/(^|[.!?]\s+)$/.test(text.slice(0, m.index!))) continue;
    add({ start: m.index!, end: m.index! + m[0].length, message: `Missing apostrophe: “${right}”`, fix: lower === "im" || lower === "ive" ? right : caseLike(m[0], right), rule: "apostrophe" });
  }
  for (const m of text.matchAll(/\b(too)\s+(the|a|an|my|your|his|her|our|their|this|that|school|work|bed)\b/gi)) add({ start: m.index!, end: m.index! + m[1].length, message: "“too” means “also” or “excessively”; here it should probably be “to”", fix: caseLike(m[1], "to"), rule: "to-too" });
  for (const m of text.matchAll(/\b(their|there)\s+(is|are|was|were|going|coming|not)\b/gi)) {
    const want = /going|coming|not/i.test(m[2]) ? "they're" : "there";
    if (m[1].toLowerCase() === want) continue;
    add({ start: m.index!, end: m.index! + m[1].length, message: `Did you mean “${want}”?`, fix: caseLike(m[1], want), rule: "their-there" });
  }
  for (const m of text.matchAll(/\b(I|you|we|they)\s+(has|is)\b/g)) {
    if (m[1] === "I" && m[2] === "is") add({ start: m.index!, end: m.index! + m[0].length, message: "Use “I am” or “I'm”", fix: "I am", rule: "agreement" });
    else if (m[2] === "has") add({ start: m.index!, end: m.index! + m[0].length, message: `Use “${m[1]} have”`, fix: `${m[1]} have`, rule: "agreement" });
  }
  for (const m of text.matchAll(/\b(he|she|it)\s+(don't|dont|have)\b/gi)) add({ start: m.index!, end: m.index! + m[0].length, message: `Use “${m[1]} ${/have/i.test(m[2]) ? "has" : "doesn't"}”`, fix: `${m[1]} ${/have/i.test(m[2]) ? "has" : "doesn't"}`, rule: "agreement" });
  for (const m of text.matchAll(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|april|june|july|august|september|october|november|december)\b/g)) add({ start: m.index!, end: m.index! + m[0].length, message: "Days and months are capitalised", fix: m[0][0].toUpperCase() + m[0].slice(1), rule: "capital-name" });
  for (const m of text.matchAll(MODAL_OF)) add({ start: m.index!, end: m.index! + m[0].length, message: `“${m[1]} of” should be “${m[1]} have”`, fix: `${m[1]} have`, rule: "modal-of" });
  for (const m of text.matchAll(/(?<=\S) {2,}(?=\S)/g)) add({ start: m.index!, end: m.index! + m[0].length, message: "Double space", fix: " ", rule: "spaces" });
  for (const m of text.matchAll(/(?<=[\p{L}\p{N}]) +([,.;:!?])(?!\d)/gu)) add({ start: m.index!, end: m.index! + m[0].length, message: "Space before punctuation", fix: m[1], rule: "space-before" });
  for (const m of text.matchAll(/([,;])(?=[\p{L}])/gu)) add({ start: m.index!, end: m.index! + 1, message: "Missing space after punctuation", fix: `${m[1]} `, rule: "space-after" });
  for (const m of text.matchAll(/(?:^|[.!?]\s+)([a-z])/gm)) {
    const at = m.index! + m[0].length - 1;
    // Skip abbreviations like "e.g. x" and "i.e. x".
    if (/\b(?:e\.g|i\.e|etc|vs|approx|cf)\.\s+$/i.test(text.slice(Math.max(0, at - 8), at))) continue;
    add({ start: at, end: at + 1, message: "Sentence should start with a capital letter", fix: m[1].toUpperCase(), rule: "capital" });
  }
  for (const m of text.matchAll(/(?<=\s|^)i(?=\s|'|’|$)/gm)) add({ start: m.index!, end: m.index! + 1, message: "“I” is always capitalised", fix: "I", rule: "pronoun-i" });
  for (const sentence of text.matchAll(/[^.!?\n]+[.!?]?/g)) {
    const words = sentence[0].trim().split(/\s+/).filter(Boolean).length;
    if (words > 35) add({ start: sentence.index!, end: sentence.index! + sentence[0].length, message: `Long sentence (${words} words). Consider splitting it.`, rule: "long" });
  }
  return issues.sort((a, b) => a.start - b.start);
}

/** Apply all fixable issues (from the end so ranges stay valid). */
export function applyFixes(text: string, issues: LintIssue[]) {
  let out = text;
  for (const issue of [...issues].filter((i) => i.fix !== undefined).sort((a, b) => b.start - a.start)) out = out.slice(0, issue.start) + issue.fix + out.slice(issue.end);
  return out;
}

function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Flesch reading ease (English). Higher is easier; 60–70 is plain English. */
export function readingEase(text: string): number | null {
  const words = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  const sentences = Math.max(1, (text.match(/[.!?]+(?=\s|$)/g) ?? []).length);
  if (words.length < 30) return null;
  const syl = words.reduce((sum, word) => sum + syllables(word), 0);
  return Math.round(206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length));
}

export function easeLabel(score: number) {
  if (score >= 80) return "Very easy";
  if (score >= 60) return "Plain English";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult (academic)";
  return "Very difficult";
}
