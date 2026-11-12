import type { Poll } from "@/lib/polls";
import questions from "@/content/questions.json";
export type QuestionPoll = Poll & { optionLabels: Record<string, string> };

const OPTIONS = [
  ["text-again", "Text again"],
  ["wait", "Wait"],
  ["leave-it", "Leave it"],
] as const;

export const QUESTION_POLL_BY_SLUG: Record<string, QuestionPoll> = Object.fromEntries(
  questions.map((question) => {
    const labels = "choices" in question && Array.isArray(question.choices) ? question.choices : OPTIONS.map(([, label]) => label);
    const options = labels.map((label, index) => `${question.slug}-choice-${index + 1}`);
    return [question.slug, {
      id: `question-${question.slug}-v1`,
      question: question.question,
      options,
      optionLabels: Object.fromEntries(options.map((option, index) => [option, labels[index]])),
      active: true,
    }];
  }),
);

export function getQuestionPoll(slug: string): QuestionPoll | undefined {
  return QUESTION_POLL_BY_SLUG[slug];
}
