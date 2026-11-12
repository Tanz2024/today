import polls from "@/content/polls.json";
import { AppwriteException } from "node-appwrite";
import { APPWRITE_DATABASE_ID, APPWRITE_POLLS_COLLECTION_ID, APPWRITE_POLL_BALLOTS_COLLECTION_ID, getDatabases, toDocumentId } from "@/lib/appwrite";
import { lockDocumentId } from "@/lib/identity";
import { recordPollVoteWithDependencies as recordCoreVote, type TransactionPoll } from "@/lib/poll-transaction-core";
import { isAppwriteDatabaseUnavailable } from "@/lib/appwrite-errors";

export type Poll = (typeof polls)[number];
export type PollCounts = Record<string, number>;
export { recordPollVoteWithDependencies } from "@/lib/poll-transaction-core";
export type { PollTransactionDependencies } from "@/lib/poll-transaction-core";
export { InvalidPollStateError, parseCounts } from "@/lib/poll-transaction-core";

export function getPoll(id: string): Poll | undefined { return polls.find((poll) => poll.id === id && poll.active); }
export function getActivePolls(): Poll[] { return polls.filter((poll) => poll.active); }

export async function getPollCounts(poll: Poll): Promise<PollCounts> {
  const databases = getDatabases(); if (!databases) return Object.fromEntries(poll.options.map((option) => [option, 0]));
  try { const doc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_POLLS_COLLECTION_ID, toDocumentId(poll.id)); const { parseCounts, InvalidPollStateError } = await import("@/lib/poll-transaction-core"); const counts = parseCounts(poll, (doc as { counts?: unknown }).counts); if (!counts) throw new InvalidPollStateError("Invalid poll aggregate"); return counts; }
  catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return Object.fromEntries(poll.options.map((option) => [option, 0]));
    if (isAppwriteDatabaseUnavailable(err)) return Object.fromEntries(poll.options.map((option) => [option, 0]));
    throw err;
  }
}

export async function getPollBallot(visitorId: string, pollId: string): Promise<string | null> {
  const databases = getDatabases(); if (!databases) return null;
  try { const doc = await databases.getDocument(APPWRITE_DATABASE_ID, APPWRITE_POLL_BALLOTS_COLLECTION_ID, lockDocumentId(visitorId, pollId)); const option = (doc as unknown as { option?: unknown }).option; return typeof option === "string" ? option : null; }
  catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    if (!isAppwriteDatabaseUnavailable(err)) console.error("[freshscene] failed to read poll ballot", err);
    return null;
  }
}

export async function recordPollVote(visitorId: string, poll: Poll, option: string): Promise<{ status: "recorded" | "duplicate"; counts: PollCounts } | null> {
  const databases = getDatabases(); if (!databases) return null;
  try {
    return await recordCoreVote(visitorId, poll as TransactionPoll, option, {
      databaseId: APPWRITE_DATABASE_ID, pollsCollectionId: APPWRITE_POLLS_COLLECTION_ID, ballotsCollectionId: APPWRITE_POLL_BALLOTS_COLLECTION_ID,
      createTransaction: () => databases.createTransaction(),
      getDocument: (databaseId, collectionId, documentId, queries, transactionId) => databases.getDocument(databaseId, collectionId, documentId, queries, transactionId),
      createDocument: (databaseId, collectionId, documentId, data, permissions, transactionId) => databases.createDocument(databaseId, collectionId, documentId, data, permissions, transactionId),
      updateDocument: (databaseId, collectionId, documentId, data, permissions, transactionId) => databases.updateDocument(databaseId, collectionId, documentId, data, permissions, transactionId),
      updateTransaction: (transactionId, commit, rollback) => databases.updateTransaction(transactionId, commit, rollback),
      getPollCounts: (transactionPoll) => getPollCounts(transactionPoll as Poll),
    });
  } catch (error) {
    if (isAppwriteDatabaseUnavailable(error)) return null;
    throw error;
  }
}
