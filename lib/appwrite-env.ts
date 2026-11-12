// Pure, import-alias-free env validation so it's directly unit-testable.
// lib/appwrite.ts's getDatabases() uses this same check before constructing
// a real Client — this file has zero dependency on node-appwrite itself.

export type AppwriteEnv = {
  APPWRITE_ENDPOINT?: string;
  APPWRITE_PROJECT_ID?: string;
  APPWRITE_API_KEY?: string;
  APPWRITE_DATABASE_ID?: string;
};

// The Appwrite SDK throws on anything that isn't an http(s) URL, so a
// placeholder or redacted value (e.g. "[SENSITIVE]") is treated as missing
// rather than crashing every page that reads Appwrite.
export function isValidAppwriteEndpoint(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function hasRequiredAppwriteEnv(env: AppwriteEnv): boolean {
  return Boolean(isValidAppwriteEndpoint(env.APPWRITE_ENDPOINT) && env.APPWRITE_PROJECT_ID && env.APPWRITE_API_KEY && env.APPWRITE_DATABASE_ID);
}
