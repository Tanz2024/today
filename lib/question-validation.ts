// Pure, import-alias-free validation so it's directly unit-testable with
// Node's built-in test runner (which doesn't resolve "@/..." aliases).

export const MAX_QUESTION_LENGTH = 800;
export const MAX_SUBMISSIONS_PER_DAY = 3;

export function validateQuestionText(text: unknown): text is string {
  return typeof text === "string" && text.trim().length > 0 && text.trim().length <= MAX_QUESTION_LENGTH;
}
