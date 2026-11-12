"use client";

import { useEffect, useState } from "react";

type User = { id: string; email: string; name?: string };

export default function CommunitySignIn({ user, onUser }: { user: User | null; onUser: (user: User | null) => void }) {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  useEffect(() => { const handler = (event: Event) => setTurnstileToken((event as CustomEvent<string>).detail ?? ""); window.addEventListener("community-turnstile", handler); return () => window.removeEventListener("community-turnstile", handler); }, []);
  if (user) return <div className="flex items-center gap-3 text-xs"><span className="text-black/50">Signed in as {user.email}</span><button type="button" className="font-semibold underline" onClick={async () => { await fetch("/api/community/auth/signout", { method: "POST" }); onUser(null); }}>Sign out</button></div>;
  async function requestCode() { setBusy(true); setMessage(""); const response = await fetch("/api/community/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, turnstileToken }) }); const data = await response.json(); setBusy(false); if (!response.ok) return setMessage(data.error ?? "Could not send the code."); setUserId(data.userId); setSent(true); setMessage("Check your email for the six-digit code."); }
  async function verify() { setBusy(true); setMessage(""); const response = await fetch("/api/community/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, secret: code }) }); const data = await response.json(); setBusy(false); if (!response.ok) return setMessage(data.error ?? "That code did not work."); onUser(data.user); }
  return <div className="mt-6 border-y border-black/[.08] py-5"><p className="text-sm font-semibold">Sign in to save drafts and submit</p><div className="mt-3 flex flex-col gap-2 sm:flex-row">{!sent ? <><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" className="min-h-11 flex-1 border border-black/10 bg-white px-3 text-sm" /><button type="button" disabled={busy || !email.includes("@")} onClick={requestCode} className="min-h-11 bg-black px-4 text-sm font-semibold text-white">Email me a code</button></> : <><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="min-h-11 flex-1 border border-black/10 bg-white px-3 text-sm" /><button type="button" disabled={busy || code.length !== 6} onClick={verify} className="min-h-11 bg-black px-4 text-sm font-semibold text-white">Verify</button></>}</div>{message && <p className="mt-2 text-xs text-black/55">{message}</p>}</div>;
}
