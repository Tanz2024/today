import { Client, Databases } from "node-appwrite";
import { hasRequiredAppwriteEnv, isValidAppwriteEndpoint } from "@/lib/appwrite-env";

let databases: Databases | null = null;
let warned = false;

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "";
export const APPWRITE_REACTIONS_COLLECTION_ID = process.env.APPWRITE_REACTIONS_COLLECTION_ID ?? "";
export const APPWRITE_POLLS_COLLECTION_ID = process.env.APPWRITE_POLLS_COLLECTION_ID ?? "";
export const APPWRITE_REACTION_LOCKS_COLLECTION_ID =
  process.env.APPWRITE_REACTION_LOCKS_COLLECTION_ID ?? "";
export const APPWRITE_POLL_BALLOTS_COLLECTION_ID =
  process.env.APPWRITE_POLL_BALLOTS_COLLECTION_ID ?? "";
export const APPWRITE_READ_STATS_COLLECTION_ID =
  process.env.APPWRITE_READ_STATS_COLLECTION_ID ?? "";
export const APPWRITE_QUICK_REACTIONS_COLLECTION_ID =
  process.env.APPWRITE_QUICK_REACTIONS_COLLECTION_ID ?? "";
export const APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID =
  process.env.APPWRITE_QUICK_REACTION_LOCKS_COLLECTION_ID ?? "";
export const APPWRITE_QUESTIONS_COLLECTION_ID =
  process.env.APPWRITE_QUESTIONS_COLLECTION_ID ?? "";
export const APPWRITE_QUESTION_REASONS_COLLECTION_ID =
  process.env.APPWRITE_QUESTION_REASONS_COLLECTION_ID ?? "question_reasons";
export const APPWRITE_QUESTION_REASON_QUOTAS_COLLECTION_ID =
  process.env.APPWRITE_QUESTION_REASON_QUOTAS_COLLECTION_ID ?? "question_reason_quotas";
export const APPWRITE_QUESTION_RELATIONS_COLLECTION_ID =
  process.env.APPWRITE_QUESTION_RELATIONS_COLLECTION_ID ?? "question_relations";

export function getDatabases(): Databases | null {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!hasRequiredAppwriteEnv({ APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: apiKey, APPWRITE_DATABASE_ID })) {
    if (!warned) {
      console.warn(
        endpoint && !isValidAppwriteEndpoint(endpoint)
          ? "[freshscene] APPWRITE_ENDPOINT is not an http(s) URL (check for a placeholder exported in your shell, which overrides .env.local). Appwrite reads are disabled."
          : "[freshscene] Appwrite env vars are missing. Reaction/poll counts will read as 0 and writes will be skipped. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID."
      );
      warned = true;
    }
    return null;
  }

  if (!databases) {
    // hasRequiredAppwriteEnv() above already confirmed these are non-empty strings.
    const client = new Client().setEndpoint(endpoint!).setProject(project!).setKey(apiKey!);
    databases = new Databases(client);
  }

  return databases;
}

// Appwrite custom document IDs allow only a-z, A-Z, 0-9, ".", "-" and "_",
// must start with a letter/digit, and are capped at 36 characters.
export function toDocumentId(raw: string): string {
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._-]+/, "");
  return (sanitized || "doc").slice(0, 36);
}
