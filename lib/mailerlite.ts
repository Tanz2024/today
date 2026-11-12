// Server-only MailerLite client. MailerLite (via MAILERLITE_GROUP_ID's "The
// Fresh Drop" group) is the subscriber source of truth — nothing here writes
// to Appwrite, and nothing here uses RESEND_API_KEY.

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean; needsConfirmation: boolean }
  | { ok: false; reason: "unavailable" | "rejected" };

export async function subscribeToMailerLite(email: string): Promise<SubscribeResult> {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;

  if (!apiKey || !groupId) {
    console.error("[newsletter] MailerLite env vars are missing");
    return { ok: false, reason: "unavailable" };
  }

  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, groups: [groupId] }),
    });

    // MailerLite's Connect API upserts subscribers: 201 = newly created,
    // 200 = existing subscriber updated (i.e. already on the list). The
    // response body's `data.status` tells us whether double opt-in is on
    // for this group — "unconfirmed" means MailerLite just emailed them a
    // confirmation link and they aren't receiving campaigns yet, so the UI
    // shouldn't claim "You're in." until they've actually confirmed.
    if (res.status === 201 || res.status === 200) {
      const body = (await res.json().catch(() => null)) as { data?: { status?: string } } | null;
      return {
        ok: true,
        alreadySubscribed: res.status === 200,
        needsConfirmation: body?.data?.status === "unconfirmed",
      };
    }

    if (res.status === 422) {
      // Validation error (e.g. malformed email MailerLite itself rejected).
      return { ok: false, reason: "rejected" };
    }

    console.error("[newsletter] MailerLite subscribe failed with status", res.status);
    return { ok: false, reason: "unavailable" };
  } catch (err) {
    console.error("[newsletter] MailerLite request failed", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unavailable" };
  }
}

// Read-only: lists groups so the group ID for "The Fresh Drop" can be found
// without hardcoding it. Never mutates anything. Used only from the
// one-off lookup script (scripts/find-mailerlite-group.mjs), not at runtime.
export async function listMailerLiteGroups(apiKey: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch("https://connect.mailerlite.com/api/groups?limit=100", {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MailerLite groups request failed with status ${res.status}`);
  const data = (await res.json()) as { data?: { id: string; name: string }[] };
  return data.data ?? [];
}
