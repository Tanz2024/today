import { getQuestions } from "@/lib/questions";
import { getApprovedQuestionRelations } from "@/lib/question-relations";
import { rankRecommendedQuestions, type PublicRecommendation, type RecommendationQuestion } from "@/lib/question-recommendations-core";

export async function getRecommendedQuestions(questionSlug: string, options: { limit?: number; excludeSlugs?: ReadonlySet<string> } = {}): Promise<PublicRecommendation[]> {
  const questions = getQuestions().map((question): RecommendationQuestion => ({ slug: question.slug, title: question.question, category: question.category, tags: question.tags, updatedAt: question.updatedAt }));
  const current = questions.find((question) => question.slug === questionSlug);
  if (!current) return [];
  const editorialRelations = await getApprovedQuestionRelations(questionSlug);
  return rankRecommendedQuestions(current, questions, new Set(editorialRelations.map((relation) => relation.slug)), options.limit ?? 3, Date.now(), options.excludeSlugs ?? new Set());
}
