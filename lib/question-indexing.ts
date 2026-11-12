// Which question pages deserve to be indexed. Shared by the page metadata and
// the sitemap so their signals always agree.

// Question-specific guidance written for that question. Questions without an
// entry fall back to GENERIC_GUIDANCE, which is identical across pages.
export const QUESTION_GUIDANCE: Record<string, string[]> = {
  "should-i-double-text": [
    "Confirming plans: send the practical follow-up. “Still good for 7 at the cafe?” is useful because it gives the other person something clear to answer.",
    "When to pause: if you have already sent a clear message and there have been several unanswered attempts, pause. More messages cannot manufacture interest or availability; wait, then decide what their silence means for your effort.",
    "A simple next step: if you remembered the address, found the link or need to correct something, send that useful detail plainly. You do not need to apologise for texting twice.",
  ],
  "why-do-i-feel-lonely-even-with-friends": [
    "You may be socially busy but emotionally unseen. Notice whether you can share difficult things, make dependable plans or be quiet without feeling like you are performing.",
    "Try one specific invitation this week: “Want to get food and talk properly on Thursday?” A smaller, honest conversation is more useful than waiting for a whole group to notice you feel distant.",
    "If loneliness lasts, affects sleep or appetite, or turns into hopelessness, talk to a trusted person, counsellor or local mental-health service. You deserve support; friendship alone is not a test you have to pass.",
  ],
};

export const GENERIC_GUIDANCE = ["Start with the pattern, not one isolated moment. Context and consistency usually tell you more than a single interaction.", "Try one small, low-pressure step and notice what happens next.", "Choose the response that protects your boundaries and leaves room for an honest answer."];

// Questions fully answered by a fuller article on the same subject.
export const QUESTION_STRONGER_ARTICLE: Record<string, { category: string; slug: string }> = {
  "what-does-dry-texting-mean": { category: "relationships", slug: "what-does-dry-texting-mean" },
};

export type QuestionIndexing =
  | { index: true }
  | { index: false; reason: "covered-by-article"; article: { category: string; slug: string } }
  | { index: false; reason: "generic-guidance" };

export function questionIndexing(slug: string): QuestionIndexing {
  const article = QUESTION_STRONGER_ARTICLE[slug];
  if (article) return { index: false, reason: "covered-by-article", article };
  if (QUESTION_GUIDANCE[slug]) return { index: true };
  return { index: false, reason: "generic-guidance" };
}
