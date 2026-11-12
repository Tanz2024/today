import "server-only";

import { Databases, ID, Query } from "node-appwrite";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";

export const APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID =
  process.env.APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID ?? "community_drafts";

export type CommunityDraftRecord = {
  $id: string;
  authorId: string;
  title: string;
  draft: string;
  updatedAt: string;
};

export function getCommunityDrafts(): Databases | null {
  return getDatabases();
}

export async function findCommunityDraft(databases: Databases, authorId: string) {
  const result = await databases.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID, [
    Query.equal("authorId", authorId),
    Query.orderDesc("updatedAt"),
    Query.limit(1),
  ]);
  return (result.documents[0] as unknown as CommunityDraftRecord | undefined) ?? null;
}

export async function saveCommunityDraft(databases: Databases, authorId: string, title: string, draft: string) {
  const existing = await findCommunityDraft(databases, authorId);
  const data = { authorId, title: title.slice(0, 140), draft, updatedAt: new Date().toISOString() };
  if (existing) return databases.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID, existing.$id, data);
  return databases.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COMMUNITY_DRAFTS_COLLECTION_ID, ID.unique(), data);
}
