import { createHash } from "node:crypto";
import { AppwriteException } from "node-appwrite";

export type TransactionPoll = { id: string; options: string[] };
export type TransactionCounts = Record<string, number>;
export class InvalidPollStateError extends Error {}
export interface PollTransactionDependencies {
  databaseId: string;
  pollsCollectionId: string;
  ballotsCollectionId: string;
  createTransaction: () => Promise<{ $id: string }>;
  getDocument: (databaseId: string, collectionId: string, documentId: string, queries: string[], transactionId: string) => Promise<unknown>;
  createDocument: (databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>, permissions: string[] | undefined, transactionId: string) => Promise<unknown>;
  updateDocument: (databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>, permissions: string[] | undefined, transactionId: string) => Promise<unknown>;
  updateTransaction: (transactionId: string, commit?: boolean, rollback?: boolean) => Promise<unknown>;
  getPollCounts: (poll: TransactionPoll) => Promise<TransactionCounts>;
}

function documentId(raw: string): string { return raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._-]+/, "").slice(0, 36) || "doc"; }
function ballotId(visitorId: string, pollId: string): string { return createHash("sha256").update(`${visitorId}:${pollId}`).digest("hex").slice(0, 36); }
function emptyCounts(poll: TransactionPoll): TransactionCounts { return Object.fromEntries(poll.options.map((option) => [option, 0])); }
export function parseCounts(poll: TransactionPoll, raw: unknown): TransactionCounts | null {
  if (typeof raw !== "string") return emptyCounts(poll);
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const counts = emptyCounts(poll);
    for (const option of poll.options) { const value = parsed[option]; if (value === undefined) continue; if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null; counts[option] = value; }
    return counts;
  } catch { return null; }
}

export async function recordPollVoteWithDependencies(visitorId: string, poll: TransactionPoll, option: string, dependencies: PollTransactionDependencies): Promise<{ status: "recorded" | "duplicate"; counts: TransactionCounts } | null> {
  const transaction = await dependencies.createTransaction();
  const id = ballotId(visitorId, poll.id);
  try {
    try {
      await dependencies.getDocument(dependencies.databaseId, dependencies.ballotsCollectionId, id, [], transaction.$id);
      await dependencies.updateTransaction(transaction.$id, false, true);
      return { status: "duplicate", counts: await dependencies.getPollCounts(poll) };
    } catch (err) { if (!(err instanceof AppwriteException && err.code === 404)) throw err; }
    let current: unknown;
    try { current = await dependencies.getDocument(dependencies.databaseId, dependencies.pollsCollectionId, documentId(poll.id), [], transaction.$id); }
    catch (err) { if (!(err instanceof AppwriteException && err.code === 404)) throw err; current = null; }
    const counts = current ? parseCounts(poll, (current as { counts?: unknown }).counts) : emptyCounts(poll);
    if (!counts) throw new InvalidPollStateError("Invalid poll aggregate");
    counts[option] = (counts[option] ?? 0) + 1;
    await dependencies.createDocument(dependencies.databaseId, dependencies.ballotsCollectionId, id, { option }, undefined, transaction.$id);
    if (current) await dependencies.updateDocument(dependencies.databaseId, dependencies.pollsCollectionId, documentId(poll.id), { counts: JSON.stringify(counts) }, undefined, transaction.$id);
    else await dependencies.createDocument(dependencies.databaseId, dependencies.pollsCollectionId, documentId(poll.id), { counts: JSON.stringify(counts) }, undefined, transaction.$id);
    await dependencies.updateTransaction(transaction.$id, true, false);
    return { status: "recorded", counts };
  } catch (err) {
    try { await dependencies.updateTransaction(transaction.$id, false, true); } catch { /* already closed */ }
    if (err instanceof AppwriteException && err.code === 409) return { status: "duplicate", counts: await dependencies.getPollCounts(poll) };
    console.error("[freshscene] failed to record poll vote", err instanceof InvalidPollStateError ? "invalid aggregate" : err instanceof Error ? err.message : "unknown error");
    return null;
  }
}
