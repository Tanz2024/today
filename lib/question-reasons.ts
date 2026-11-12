import { AppwriteException, Query } from "node-appwrite";
import { APPWRITE_DATABASE_ID, APPWRITE_QUESTION_REASONS_COLLECTION_ID, getDatabases } from "@/lib/appwrite";
import { MAX_REASON_LENGTH, validateQuestionReason } from "@/lib/question-reason-validation";
import { recordQuestionReason } from "@/lib/question-reason-transaction-core";
export { MAX_REASON_LENGTH };
export type ReasonStatus = "pending" | "approved" | "rejected";
export type PublicQuestionReason = { optionId: string; reason: string };
const QUOTAS_COLLECTION_ID = process.env.APPWRITE_QUESTION_REASON_QUOTAS_COLLECTION_ID ?? "question_reason_quotas";
const DAILY_LIMIT = 5;
export function utcDayKey(date = new Date()): string { return date.toISOString().slice(0, 10); }
export async function submitQuestionReason(input: { pollId: string; questionSlug: string; optionId: string; reason: unknown; visitorHash: string }) {
  const validation = validateQuestionReason(input.reason); if (!validation.ok) return { ok: false as const, kind: "invalid" as const, error: validation.error };
  const databases = getDatabases(); if (!databases) return { ok: false as const, kind: "unavailable" as const };
  const result = await recordQuestionReason({ ...input, reason: validation.reason, day: utcDayKey() }, { databaseId: APPWRITE_DATABASE_ID, reasonsCollectionId: APPWRITE_QUESTION_REASONS_COLLECTION_ID, quotasCollectionId: QUOTAS_COLLECTION_ID, dailyLimit: DAILY_LIMIT, createTransaction: () => databases.createTransaction(), getDocument: (a,b,c,d,e) => databases.getDocument(a,b,c,d,e), createDocument: (a,b,c,d,e,f) => databases.createDocument(a,b,c,d,e,f), updateDocument: (a,b,c,d,e,f) => databases.updateDocument(a,b,c,d,e,f), updateTransaction: (a,b,c) => databases.updateTransaction(a,b,c), isNotFound: (e) => e instanceof AppwriteException && e.code === 404, isConflict: (e) => e instanceof AppwriteException && e.code === 409 });
  if (result?.status === "recorded") return { ok: true as const }; if (result?.status === "duplicate") return { ok: false as const, kind: "duplicate" as const }; if (result?.status === "rate_limited") return { ok: false as const, kind: "rate_limited" as const }; return { ok: false as const, kind: "unavailable" as const };
}
export async function getApprovedQuestionReasons(pollId: string): Promise<PublicQuestionReason[]> { const databases = getDatabases(); if (!databases) return []; try { const result = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_QUESTION_REASONS_COLLECTION_ID, [Query.equal("pollId", pollId), Query.equal("status", "approved"), Query.orderDesc("$createdAt"), Query.limit(50)]); return result.documents.flatMap((document) => typeof document.reason === "string" && typeof document.optionId === "string" ? [{ optionId: document.optionId, reason: document.reason }] : []); } catch { return []; } }
