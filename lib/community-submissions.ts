import "server-only";
import { Databases } from "node-appwrite";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";
export { APPWRITE_DATABASE_ID };
export const APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID = process.env.APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID ?? "community_submissions";
export function getCommunityDatabases(): Databases | null { return getDatabases(); }
