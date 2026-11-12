import { revalidatePath } from "next/cache";
import { getQuestions } from "@/lib/questions";
import { revalidateQuestionPath } from "@/lib/question-revalidation-core";

export function revalidateQuestionPage(slug: string) {
  return revalidateQuestionPath(slug, new Set(getQuestions().map((question) => question.slug)), (path) => revalidatePath(path, "page"));
}
