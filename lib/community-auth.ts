import "server-only";

import { Account, Client, ID } from "node-appwrite";
import { cookies } from "next/headers";

export const COMMUNITY_SESSION_COOKIE = "brisastory_community_session";

function client() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !key) throw new Error("Appwrite authentication is not configured");
  return new Client().setEndpoint(endpoint).setProject(project).setKey(key);
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function requestCommunityOtp(email: string) {
  const account = new Account(client());
  return account.createEmailToken({ userId: ID.unique(), email, phrase: true });
}

export async function createCommunitySession(userId: string, secret: string) {
  const session = await new Account(client()).createSession({ userId, secret });
  (await cookies()).set(COMMUNITY_SESSION_COOKIE, session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return session;
}

export async function getCurrentCommunityUser() {
  const secret = (await cookies()).get(COMMUNITY_SESSION_COOKIE)?.value;
  if (!secret) return null;
  try {
    const account = new Account(client().setSession(secret));
    return await account.get();
  } catch {
    return null;
  }
}

export async function deleteCommunitySession() {
  const secret = (await cookies()).get(COMMUNITY_SESSION_COOKIE)?.value;
  if (secret) {
    try { await new Account(client().setSession(secret)).deleteSession({ sessionId: "current" }); } catch { /* expired sessions are already signed out */ }
  }
  (await cookies()).set(COMMUNITY_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
