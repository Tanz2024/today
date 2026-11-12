"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { trackHomepageEvent } from "@/lib/homepage-analytics";

// TodayAI tokens (see app/globals.css). Inline styles are kept so the
// component renders correctly on any surface, including the dark footer card.
const CTA = "var(--ink)";
const EYEBROW = "var(--brand-red-strong)";
const INK = "var(--ink)";
const SUPPORTING = "var(--text-subtle)";
const INPUT_BORDER = "var(--line-strong)";

type Variant = "homepage" | "article" | "footer";

type Copy = {
  eyebrow: string;
  headline: string;
  description?: string;
  cta: string;
  frequencyNote: string;
};

const COPY: Record<Variant, Copy> = {
  homepage: {
    eyebrow: "THE FRESH DROP",
    headline: "The week in AI, in one email.",
    description: "New TodayAI stories, guides and tools every Friday — clearly explained, without the hype.",
    cta: "Subscribe",
    frequencyNote: "Every Friday. Free. Unsubscribe anytime.",
  },
  article: {
    eyebrow: "Liked this?",
    headline: "The Fresh Drop sends you the best of TodayAI once a week.",
    cta: "Join The Drop →",
    frequencyNote: "Every Friday. Free.",
  },
  footer: {
    eyebrow: "THE FRESH DROP",
    headline: "The week in AI, every Friday.",
    cta: "Join",
    frequencyNote: "Every Friday. Free.",
  },
};

type Status = "idle" | "sending" | "sent" | "already" | "confirm" | "error";

export default function NewsletterSignup({ variant, deskName }: { variant: Variant; deskName?: string }) {
  // One template, filled with the article's public desk when known.
  const copy = variant === "article" && deskName
    ? { ...COPY.article, headline: `New ${deskName} stories and the best of TodayAI, once a week.` }
    : COPY[variant];
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());
  const emailId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");

    const form = event.currentTarget;
    const website = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website, startedAt }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      if (data.needsConfirmation) {
        // Double opt-in is on for this MailerLite group — they aren't
        // actually subscribed yet, just emailed a confirmation link.
        setStatus("confirm");
      } else if (data.alreadySubscribed) {
        setStatus("already");
      } else {
        setStatus("sent");
        try {
          trackHomepageEvent("newsletter_signup");
        } catch {
          // analytics is best-effort, never blocks the signup itself
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const isCompact = variant === "footer";
  const isDone = status === "sent" || status === "already" || status === "confirm";

  if (isDone) {
    const headline =
      status === "sent"
        ? "You're in."
        : status === "confirm"
          ? "Almost there — check your inbox."
          : "You're already on the list.";

    const subline =
      status === "confirm"
        ? "Click the confirmation link we just sent you to start getting The Fresh Drop."
        : "The Fresh Drop lands every Friday.";

    return (
      <div role="status" aria-live="polite" className={isCompact ? "text-sm" : "py-1"}>
        <p className={`font-semibold ${isCompact ? "text-sm" : "text-[17px] sm:text-[19px]"}`} style={{ color: INK }}>
          {headline}
        </p>
        {!isCompact && <p className="mt-1 text-sm text-muted">{subline}</p>}
      </div>
    );
  }

  return (
    <div>
      {!isCompact && (
        <>
          {variant !== "homepage" && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: EYEBROW }}>
              {copy.eyebrow}
            </p>
          )}
          <h2
            className={
              variant === "homepage"
                ? "mt-2 max-w-xl font-heading text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px]"
                : "mt-2 font-heading text-[19px] font-semibold leading-[1.3] sm:text-[21px]"
            }
            style={{ color: INK }}
          >
            {copy.headline}
          </h2>
          {copy.description && <p className="mt-2 text-[14px] sm:text-[15px]" style={{ color: SUPPORTING }}>{copy.description}</p>}
        </>
      )}
      {isCompact && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em]" style={{ color: EYEBROW }}>
            {copy.eyebrow}
          </p>
          <p className="mt-1 text-sm" style={{ color: SUPPORTING }}>{copy.headline}</p>
        </>
      )}

      <form onSubmit={submit} aria-label="Subscribe to The Fresh Drop newsletter" className={isCompact ? "mt-3" : "mt-4"}>
        {!isCompact && (
          <label htmlFor={emailId} className="text-sm font-semibold" style={{ color: INK }}>
            Email address
          </label>
        )}
        {isCompact && (
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
        )}

        {/* Input + button presented as one visual system, not two separate controls. */}
        <div
          className={`flex flex-col overflow-hidden rounded-[10px] border bg-white transition-colors focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 sm:flex-row ${
            isCompact ? "" : "mt-2"
          }`}
          style={{ borderColor: INPUT_BORDER }}
        >
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-muted"
            style={{ color: INK }}
          />

          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-12 shrink-0 border-t px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#111827] disabled:opacity-60 sm:border-l sm:border-t-0"
            style={{ backgroundColor: CTA, borderColor: INPUT_BORDER }}
          >
            {status === "sending" ? "Joining…" : copy.cta}
          </button>
        </div>

        {/* Honeypot — hidden from sighted/keyboard users, visible in the DOM for bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      </form>

      {status === "error" && (
        <p role="alert" className="mt-2 text-sm font-medium text-[#9E285A]">
          {error}
        </p>
      )}

      <p className={`${isCompact ? "mt-2 text-[11px]" : "mt-2.5 text-[12px]"}`} style={{ color: SUPPORTING }}>
        {copy.frequencyNote}{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[#1F2937]">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
