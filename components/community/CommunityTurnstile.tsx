"use client";
import Script from "next/script";
import { useEffect } from "react";
export default function CommunityTurnstile({ action = "community-submit" }: { action?: string }) { useEffect(() => { const win = window as Window & { communityTurnstile?: (token: string) => void }; win.communityTurnstile = (token) => window.dispatchEvent(new CustomEvent("community-turnstile", { detail: token })); return () => { delete win.communityTurnstile; }; }, []); const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY; if (!siteKey) return null; return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile mt-6" data-sitekey={siteKey} data-action={action} data-callback="communityTurnstile" /></>; }
