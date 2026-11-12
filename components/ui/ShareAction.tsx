"use client";

import { useState } from "react";
import { Check, ShareNetwork, Warning } from "@phosphor-icons/react";
import { buildShareCampaignUrl } from "@/lib/campaign";

export default function ShareAction({
  title,
  text,
  url,
  className = "",
  cardParams,
  compactOnMobile = false,
  campaign,
}: {
  title: string;
  text: string;
  url: string;
  className?: string;
  /** Optional — when provided, tries sharing a branded 1080x1920 image first. */
  cardParams?: { kicker: string; title: string; subtitle?: string };
  /** Opt-in: icon-only + tighter padding below `sm:`, full labeled button from `sm:` up. Other call sites are unaffected unless they pass this. */
  compactOnMobile?: boolean;
  campaign?: { slug: string };
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function shareCardImage(): Promise<boolean> {
    if (!cardParams || typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
      return false;
    }

    try {
      const params = new URLSearchParams({ kicker: cardParams.kicker, title: cardParams.title });
      if (cardParams.subtitle) params.set("subtitle", cardParams.subtitle);

      const res = await fetch(`/api/share-card?${params.toString()}`);
      if (!res.ok) return false;

      const blob = await res.blob();
      const file = new File([blob], "brisastory.png", { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) return false;

      await navigator.share({ files: [file], title, text });
      return true;
    } catch {
      // Fetch failed, or the user cancelled the native share sheet — either
      // way, fall through to the plain text/link share below.
      return false;
    }
  }

  // Works even without the (HTTPS-only) Clipboard API, so copying still
  // works on plain http:// or a non-localhost dev IP.
  function legacyCopy(value: string): boolean {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 1800);
        return;
      } catch {
        // fall through to the legacy fallback below
      }
    }

    if (legacyCopy(url)) {
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
      return;
    }

    // Nothing worked — never fail silently. Prompt lets the reader copy the
    // link manually even when every automated path is blocked.
    setStatus("failed");
    window.setTimeout(() => setStatus("idle"), 3000);
    window.prompt("Copy this link:", url);
  }

  async function share() {
    const nativeUrl = campaign ? buildShareCampaignUrl(url, "native", campaign.slug) : url;
    const copyUrl = campaign ? buildShareCampaignUrl(url, "copy", campaign.slug) : url;
    if (await shareCardImage()) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: nativeUrl });
        return;
      } catch (err) {
        // AbortError means the reader closed the native share sheet on
        // purpose — leave it. Anything else, fall back to copy-link so the
        // click still does something.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (copyUrl === url) await copyLink();
    else {
      try { await navigator.clipboard?.writeText(copyUrl); setStatus("copied"); window.setTimeout(() => setStatus("idle"), 1800); }
      catch { setStatus("failed"); window.setTimeout(() => setStatus("idle"), 3000); window.prompt("Copy this link:", copyUrl); }
    }
  }

  const label = status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy" : "Share";

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`${label} ${title.toLowerCase()}`}
      className={`flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric ${
        compactOnMobile ? "px-3 sm:px-4" : "px-4"
      } ${
        status === "failed"
          ? "border-[#9E285A] text-[#9E285A]"
          : "text-near-black hover:text-electric"
      } ${className}`}
    >
      {status === "copied" ? (
        <Check size={16} weight="bold" aria-hidden />
      ) : status === "failed" ? (
        <Warning size={16} weight="bold" aria-hidden />
      ) : (
        <ShareNetwork size={16} aria-hidden />
      )}
      <span className={compactOnMobile ? "hidden sm:inline" : undefined}>{label}</span>
    </button>
  );
}
