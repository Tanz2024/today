import { createHash } from "node:crypto";

export const RELATION_TYPES = ["related", "follow_up", "same_topic", "contrasting"] as const;
export const RELATION_STATUSES = ["approved", "disabled"] as const;
export type RelationType = typeof RELATION_TYPES[number];
export type RelationStatus = typeof RELATION_STATUSES[number];
export type RelationRecord = { sourceQuestionSlug: string; targetQuestionSlug: string; relationType: string; priority: number; status: string };
export type RelatedQuestion = { slug: string; question: string; relationType: RelationType };

export function relationDocumentId(sourceQuestionSlug: string, targetQuestionSlug: string, relationType: string): string { return createHash("sha256").update(`question-relation:${sourceQuestionSlug}:${targetQuestionSlug}:${relationType}`).digest("hex").slice(0, 36); }
export function validateRelation(input: { sourceQuestionSlug: string; targetQuestionSlug: string; relationType: unknown; priority: unknown; status: unknown }, questions: ReadonlyMap<string, string>): { ok: true; relationType: RelationType; priority: number; status: RelationStatus } | { ok: false; error: string } {
  if (!questions.has(input.sourceQuestionSlug) || !questions.has(input.targetQuestionSlug)) return { ok: false, error: "Unknown question reference" };
  if (input.sourceQuestionSlug === input.targetQuestionSlug) return { ok: false, error: "A question cannot relate to itself" };
  if (typeof input.relationType !== "string" || !RELATION_TYPES.includes(input.relationType as RelationType)) return { ok: false, error: "Invalid relation type" };
  if (typeof input.priority !== "number" || !Number.isSafeInteger(input.priority) || input.priority < 0 || input.priority > 1000) return { ok: false, error: "Invalid priority" };
  if (typeof input.status !== "string" || !RELATION_STATUSES.includes(input.status as RelationStatus)) return { ok: false, error: "Invalid relation status" };
  return { ok: true, relationType: input.relationType as RelationType, priority: input.priority, status: input.status as RelationStatus };
}
export function approvedRelatedQuestions(sourceSlug: string, records: readonly RelationRecord[], questions: ReadonlyMap<string, string>, limit = 3): RelatedQuestion[] {
  const seen = new Set<string>();
  return records.filter((record) => record.sourceQuestionSlug === sourceSlug && record.status === "approved" && RELATION_TYPES.includes(record.relationType as RelationType) && record.targetQuestionSlug !== sourceSlug && questions.has(record.targetQuestionSlug)).sort((a, b) => a.priority - b.priority).flatMap((record) => { if (seen.has(record.targetQuestionSlug)) return []; seen.add(record.targetQuestionSlug); return [{ slug: record.targetQuestionSlug, question: questions.get(record.targetQuestionSlug)!, relationType: record.relationType as RelationType }]; }).slice(0, limit);
}
export function mergeRelatedQuestions(sources: readonly (readonly RelatedQuestion[])[], currentSlug = "", limit = 3): RelatedQuestion[] { const seen = new Set<string>(); return sources.flat().filter((item) => { if (!item.slug || !item.question || item.slug === currentSlug || seen.has(item.slug)) return false; seen.add(item.slug); return true; }).slice(0, limit); }
