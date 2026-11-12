import { ID, Query } from "node-appwrite";
import { APPWRITE_DATABASE_ID, APPWRITE_QUESTIONS_COLLECTION_ID, getDatabases } from "@/lib/appwrite";
import { MAX_QUESTION_LENGTH, MAX_SUBMISSIONS_PER_DAY, validateQuestionText } from "@/lib/question-validation";

export { MAX_QUESTION_LENGTH, MAX_SUBMISSIONS_PER_DAY, validateQuestionText } from "@/lib/question-validation";

export type SubmitQuestionResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate-limited" | "unavailable" };

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export async function submitQuestion(
  visitorHash: string,
  text: string,
  topic?: string
): Promise<SubmitQuestionResult> {
  if (!validateQuestionText(text)) return { ok: false, error: "invalid" };

  const databases = getDatabases();
  if (!databases) return { ok: false, error: "unavailable" };

  try {
    const { total } = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_QUESTIONS_COLLECTION_ID,
      [
        Query.equal("visitorHash", visitorHash),
        Query.greaterThanEqual("$createdAt", startOfTodayIso()),
      ]
    );
    if (total >= MAX_SUBMISSIONS_PER_DAY) return { ok: false, error: "rate-limited" };

    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_QUESTIONS_COLLECTION_ID,
      ID.unique(),
      {
        text: text.trim().slice(0, MAX_QUESTION_LENGTH),
        topic: topic?.trim().slice(0, 80) || "",
        status: "pending",
        visitorHash,
      }
    );

    return { ok: true };
  } catch (err) {
    // Never log the submitted question text — only that the write failed.
    console.error("[freshscene] failed to submit question", err instanceof Error ? err.message : err);
    return { ok: false, error: "unavailable" };
  }
}
