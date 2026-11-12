import { Query } from "node-appwrite";
import { APPWRITE_DATABASE_ID, APPWRITE_QUESTION_RELATIONS_COLLECTION_ID, getDatabases } from "@/lib/appwrite";
import { getQuestions } from "@/lib/questions";
import { approvedRelatedQuestions, relationDocumentId, validateRelation, type RelationRecord, type RelatedQuestion } from "@/lib/question-relations-core";
import { revalidateQuestionPage } from "@/lib/question-revalidation";

const questionMap = () => new Map(getQuestions().map((question) => [question.slug, question.question]));
export { relationDocumentId } from "@/lib/question-relations-core";
export type { RelatedQuestion } from "@/lib/question-relations-core";

export async function createQuestionRelation(input: { sourceQuestionSlug: string; targetQuestionSlug: string; relationType: unknown; priority: unknown; status: unknown }) {
  const validation = validateRelation(input, questionMap()); if (!validation.ok) return validation;
  const databases = getDatabases(); if (!databases) return { ok: false as const, error: "Appwrite is unavailable" };
  try { await databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_QUESTION_RELATIONS_COLLECTION_ID, relationDocumentId(input.sourceQuestionSlug, input.targetQuestionSlug, validation.relationType), { sourceQuestionSlug: input.sourceQuestionSlug, targetQuestionSlug: input.targetQuestionSlug, relationType: validation.relationType, priority: validation.priority, status: validation.status }); revalidateQuestionPage(input.sourceQuestionSlug); return { ok: true as const }; }
  catch { return { ok: false as const, error: "Could not create relation" }; }
}

export async function getApprovedQuestionRelations(sourceQuestionSlug: string): Promise<RelatedQuestion[]> {
  const databases = getDatabases(); if (!databases) return [];
  try {
    const result = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_QUESTION_RELATIONS_COLLECTION_ID, [Query.equal("sourceQuestionSlug", sourceQuestionSlug), Query.equal("status", "approved"), Query.orderAsc("priority"), Query.limit(50)]);
    const records: RelationRecord[] = result.documents.flatMap((document) => typeof document.sourceQuestionSlug === "string" && typeof document.targetQuestionSlug === "string" && typeof document.relationType === "string" && typeof document.priority === "number" && typeof document.status === "string" ? [{ sourceQuestionSlug: document.sourceQuestionSlug, targetQuestionSlug: document.targetQuestionSlug, relationType: document.relationType, priority: document.priority, status: document.status }] : []);
    return approvedRelatedQuestions(sourceQuestionSlug, records, questionMap());
  } catch { return []; }
}
