import { createHash } from "node:crypto";
export type ReasonTransactionInput = { pollId: string; questionSlug: string; optionId: string; reason: string; visitorHash: string; day: string };
export type ReasonTransactionResult = { status: "recorded" | "duplicate" | "rate_limited" } | null;
export interface ReasonTransactionDependencies { databaseId: string; reasonsCollectionId: string; quotasCollectionId: string; dailyLimit: number; createTransaction: () => Promise<{ $id: string }>; getDocument: (databaseId: string, collectionId: string, documentId: string, queries: string[], transactionId: string) => Promise<unknown>; createDocument: (databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>, permissions: string[] | undefined, transactionId: string) => Promise<unknown>; updateDocument: (databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>, permissions: string[] | undefined, transactionId: string) => Promise<unknown>; updateTransaction: (transactionId: string, commit?: boolean, rollback?: boolean) => Promise<unknown>; isNotFound: (error: unknown) => boolean; isConflict: (error: unknown) => boolean; }
export function reasonDocumentId(visitorHash: string, pollId: string): string { return createHash("sha256").update(`reason:${visitorHash}:${pollId}`).digest("hex").slice(0, 36); }
export function quotaDocumentId(visitorHash: string, day: string): string { return createHash("sha256").update(`reason-quota:${visitorHash}:${day}`).digest("hex").slice(0, 36); }
export async function recordQuestionReason(input: ReasonTransactionInput, deps: ReasonTransactionDependencies, maxAttempts = 3): Promise<ReasonTransactionResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) { const transaction = await deps.createTransaction(); try {
    const reasonId = reasonDocumentId(input.visitorHash, input.pollId); const quotaId = quotaDocumentId(input.visitorHash, input.day);
    try { await deps.getDocument(deps.databaseId, deps.reasonsCollectionId, reasonId, [], transaction.$id); await deps.updateTransaction(transaction.$id, false, true); return { status: "duplicate" }; } catch (error) { if (!deps.isNotFound(error)) throw error; }
    let quota: { count?: unknown } | null = null; try { quota = await deps.getDocument(deps.databaseId, deps.quotasCollectionId, quotaId, [], transaction.$id) as { count?: unknown }; } catch (error) { if (!deps.isNotFound(error)) throw error; }
    const count = quota && typeof quota.count === "number" && Number.isSafeInteger(quota.count) && quota.count >= 0 ? quota.count : 0;
    if (count >= deps.dailyLimit) { await deps.updateTransaction(transaction.$id, false, true); return { status: "rate_limited" }; }
    await deps.createDocument(deps.databaseId, deps.reasonsCollectionId, reasonId, { pollId: input.pollId, questionSlug: input.questionSlug, optionId: input.optionId, reason: input.reason, status: "pending", visitorHash: input.visitorHash }, undefined, transaction.$id);
    if (quota) await deps.updateDocument(deps.databaseId, deps.quotasCollectionId, quotaId, { count: count + 1, day: input.day }, undefined, transaction.$id); else await deps.createDocument(deps.databaseId, deps.quotasCollectionId, quotaId, { count: 1, day: input.day }, undefined, transaction.$id);
    await deps.updateTransaction(transaction.$id, true, false); return { status: "recorded" };
  } catch (error) { try { await deps.updateTransaction(transaction.$id, false, true); } catch { /* closed */ } if (deps.isConflict(error) && attempt + 1 < maxAttempts) continue; return null; } }
  return null;
}
