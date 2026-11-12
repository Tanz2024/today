export type DiscoveryQuestion = { slug: string; title: string; category: string; publishedAt?: unknown; updatedAt?: unknown };
export type DiscoveryItem = { slug: string; title: string; category: string; publishedAt: string };
export type DiscussedCandidate = DiscoveryItem & { approvedReasonCount: number; voteCount: number };

const dateValue = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export function getNewQuestions(questions: DiscoveryQuestion[], limit = 6, excludeSlugs: ReadonlySet<string> = new Set()): DiscoveryItem[] {
  return questions.flatMap((question) => { const date = dateValue(question.publishedAt); return date === null || excludeSlugs.has(question.slug) ? [] : [{ ...question, publishedAt: new Date(date).toISOString().slice(0, 10) }]; })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.slug.localeCompare(b.slug)).slice(0, Math.max(0, limit));
}

export function getMostDiscussedQuestions(candidates: DiscussedCandidate[], limit = 5): DiscoveryItem[] {
  return candidates.filter((candidate) => Number.isFinite(candidate.approvedReasonCount) && candidate.approvedReasonCount > 0)
    .sort((a, b) => b.approvedReasonCount - a.approvedReasonCount || b.voteCount - a.voteCount || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.slug.localeCompare(b.slug))
    .slice(0, Math.max(0, limit)).map(({ slug, title, category, publishedAt }) => ({ slug, title, category, publishedAt }));
}
