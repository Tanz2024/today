// Deterministic job-description keyword matching. This compares wording
// only. It is not an ATS score and makes no claim about how any employer's
// screening software ranks a CV.

export type JdTerm = { term: string; kind: "skill" | "keyword"; count: number; required: boolean };
export type TermMatch = JdTerm & { found: boolean };

const STOP = new Set(`a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each either etc few for from further had has have having he her here hers him his how i if in into is it its itself just least less let like ll made make many may me might more most much must my need needs no nor not now of off often on once one only or other our ours out over own per please plus re role s same she should so some such than that the their them then there these they this those through to too under until up upon us use used using ve very via was way we well were what when where which while who whom why will with within without would yet you your yours
able ability across apply applicant applicants based benefit benefits candidate candidates company day days do duties environment etc excellent experience experienced including job join looking new opportunity part position preferred required requirement requirements responsibilities responsible role salary skills strong team teams time understanding work working world year years good great high highly key ideal ideally best within across ensure support provide help across various related relevant other plus bonus equal employer opportunity`.split(/\s+/));

// Multi-word skills recognised as one term. Lower-case.
const PHRASES = ["project management", "product management", "machine learning", "deep learning", "data analysis", "data analytics", "data science", "data engineering", "data visualization", "data visualisation", "customer service", "customer success", "stakeholder management", "account management", "business development", "software development", "software engineering", "web development", "front end", "front-end", "back end", "back-end", "full stack", "full-stack", "unit testing", "test automation", "continuous integration", "ci/cd", "version control", "problem solving", "problem-solving", "time management", "attention to detail", "written communication", "verbal communication", "public speaking", "financial analysis", "financial modelling", "financial modeling", "risk management", "quality assurance", "supply chain", "digital marketing", "content marketing", "social media", "search engine optimization", "user research", "user experience", "ux design", "ui design", "graphic design", "natural language processing", "computer vision", "cloud computing", "google cloud", "power bi", "microsoft excel", "microsoft office", "react native", "node.js", "next.js", "rest api", "rest apis", "agile methodologies", "scrum master", "change management", "people management", "team leadership", "budget management", "health and safety", "first aid", "driving licence", "driver's license"];

const SYNONYMS: Record<string, string[]> = {
  javascript: ["js"], typescript: ["ts"], "machine learning": ["ml"], "artificial intelligence": ["ai"], kubernetes: ["k8s"], postgresql: ["postgres"], "amazon web services": ["aws"], "google cloud": ["gcp"], "user experience": ["ux"], "search engine optimization": ["seo"], "continuous integration": ["ci/cd", "ci"], "front end": ["front-end", "frontend"], "back end": ["back-end", "backend"], "full stack": ["full-stack", "fullstack"], "data visualization": ["data visualisation"], "financial modeling": ["financial modelling"], "problem solving": ["problem-solving"], "microsoft excel": ["excel"],
};

const TECH = /(?:^|[\s,(/])((?:[A-Z][A-Za-z0-9]*[.+#][A-Za-z0-9+#.]*)|(?:[A-Z]{2,}[A-Za-z0-9]*)|(?:[A-Z][a-z]+[A-Z][A-Za-z0-9]*)|(?:[A-Za-z]+\.js))(?=$|[\s,.;:)/])/g;
// Capitalised words that are not skills even mid-sentence.
const NOT_SKILLS = new Set(["Engineer", "Engineers", "Developer", "Manager", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December", "Senior", "Junior", "Lead", "Head", "Team", "Company", "Ltd", "Inc", "London", "Remote", "Hybrid", "Office", "English"]);
const REQUIRED = /\b(required|must|essential|minimum|need to|you have|you will have|proficien|experience (with|in)|knowledge of|familiar(ity)? with|qualification)/i;

export const normalizeWord = (word: string) => {
  const w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
};

const normalizePhrase = (phrase: string) => phrase.toLowerCase().split(/\s+/).map(normalizeWord).join(" ");
const wordsOf = (text: string) => text.match(/[A-Za-z][A-Za-z0-9+#.'-]*[A-Za-z0-9+#]|[A-Za-z]/g) ?? [];

export function extractJobTerms(jobDescription: string, limit = 30): JdTerm[] {
  const text = jobDescription.replace(/\r/g, "");
  const lower = text.toLowerCase();
  const terms = new Map<string, JdTerm>();
  const requiredLines = text.split(/\n|(?<=[.!?])\s+/).filter((line) => REQUIRED.test(line)).join("\n").toLowerCase();
  const add = (term: string, kind: JdTerm["kind"], count: number) => {
    const key = normalizePhrase(term);
    if (!key || key.length < 2) return;
    const existing = terms.get(key);
    if (existing) { existing.count = Math.max(existing.count, count); if (kind === "skill") existing.kind = "skill"; return; }
    terms.set(key, { term, kind, count, required: requiredLines.includes(term.toLowerCase()) });
  };
  for (const phrase of PHRASES) {
    const count = lower.split(phrase).length - 1;
    if (count) add(phrase, "skill", count);
  }
  for (const match of text.matchAll(TECH)) {
    const term = match[1].replace(/[.]+$/, "");
    if (STOP.has(term.toLowerCase()) || /^[A-Z]{2,}$/.test(term) && ["THE", "AND", "FOR", "YOU", "OUR", "WE"].includes(term)) continue;
    add(term, "skill", text.split(term).length - 1);
  }
  // Capitalised words mid-sentence are usually products, tools or methods (React, Jest, Salesforce).
  for (const match of text.matchAll(/(?<=[^.!?:\n•\-–][ \t]+|[,(/][ \t]*)([A-Z][a-z]{2,}[A-Za-z]*)\b(?![.][A-Za-z])/g)) {
    const word = match[1];
    if (STOP.has(word.toLowerCase()) || NOT_SKILLS.has(word)) continue;
    add(word, "skill", text.split(word).length - 1);
  }
  // Repeated content words and two-word phrases.
  const words = wordsOf(text).map((w) => w.toLowerCase());
  const counts = new Map<string, { count: number; display: string }>();
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (STOP.has(w) || w.length < 3 || /^\d/.test(w)) continue;
    const key = normalizeWord(w);
    counts.set(key, { count: (counts.get(key)?.count ?? 0) + 1, display: counts.get(key)?.display ?? w });
    const next = words[i + 1];
    if (next && !STOP.has(next) && next.length > 2) {
      const bigram = `${w} ${next}`;
      const bkey = normalizePhrase(bigram);
      counts.set(bkey, { count: (counts.get(bkey)?.count ?? 0) + 1, display: counts.get(bkey)?.display ?? bigram });
    }
  }
  for (const [key, { count, display }] of counts) {
    if (count < 2) continue;
    if ([...terms.keys()].some((existing) => existing.includes(key))) continue;
    add(display, "keyword", count);
  }
  return [...terms.values()]
    // Drop pieces of slash terms ("CI" from "CI/CD") and single words that are part of a kept phrase.
    .filter((t, _, all) => !all.some((o) => o !== t && o.term.includes("/") && o.term.toLowerCase().split("/").includes(t.term.toLowerCase())))
    .filter((t, _, all) => t.term.includes(" ") || !all.some((o) => o !== t && o.term.includes(" ") && normalizePhrase(o.term).split(" ").includes(normalizePhrase(t.term)) && o.count >= t.count))
    .sort((a, b) => Number(b.required) - Number(a.required) || Number(b.kind === "skill") - Number(a.kind === "skill") || b.count - a.count)
    .slice(0, limit);
}

/** Is the term (or a listed synonym / inflection) in the CV text? */
export function cvMentions(cvText: string, term: string) {
  const haystack = ` ${wordsOf(cvText).map(normalizeWord).join(" ")} `;
  const raw = ` ${cvText.toLowerCase()} `;
  const variants = [term.toLowerCase(), ...(SYNONYMS[term.toLowerCase()] ?? []), ...Object.entries(SYNONYMS).filter(([, list]) => list.includes(term.toLowerCase())).map(([key]) => key)];
  return variants.some((variant) => {
    if (/[+#.]/.test(variant)) return raw.includes(variant);
    return haystack.includes(` ${normalizePhrase(variant)} `);
  });
}

export function matchTerms(cvText: string, jobDescription: string): TermMatch[] {
  return extractJobTerms(jobDescription).map((term) => ({ ...term, found: cvMentions(cvText, term.term) }));
}
