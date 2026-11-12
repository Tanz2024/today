"use client";

import { useEffect } from "react";
import { isMeaningfulRead, isWithinDedupeWindow, MIN_BODY_SCROLL_RATIO, MIN_READ_SECONDS, READ_RECORDED_EVENT } from "@/lib/read-tracking";

function dedupeKey(slug: string) {
  return `brisastory:read-recorded:${slug}`;
}

// Anonymous, local-only dedupe: refreshing or reopening the same article on
// the same device within the dedupe window never counts a second read. No
// login, no fingerprinting, no server-side identity — just a timestamp this
// browser already owns.
function alreadyCountedRecently(slug: string): boolean {
  try {
    return isWithinDedupeWindow(Number(localStorage.getItem(dedupeKey(slug))));
  } catch {
    return false;
  }
}

function markCounted(slug: string) {
  try {
    localStorage.setItem(dedupeKey(slug), String(Date.now()));
  } catch {
    // localStorage unavailable — worst case this device can double count
    // once, which is still far better than losing the anonymous-dedupe
    // requirement entirely.
  }
}

function recordViewMetrics(slug: string) {
  const key = `brisastory:reader-seen:${slug}`;
  let repeat = false;
  try {
    repeat = localStorage.getItem(key) === "1";
    localStorage.setItem(key, "1");
  } catch {
    // Metrics remain anonymous if localStorage is unavailable.
  }
  void fetch(`/api/page-view/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metric: "pageViews" }), keepalive: true }).catch(() => {});
  void fetch(`/api/page-view/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ metric: repeat ? "repeatViews" : "uniqueReaders" }), keepalive: true }).catch(() => {});
}

// Progress through the article body only — never the header, related
// stories, footer or sticky toolbar. Matches the same `.article-reading-content`
// elements the mobile progress bar measures against.
function articleBodyScrollRatio(): number {
  const body = document.querySelectorAll<HTMLElement>(".article-reading-content");
  if (body.length === 0) return 0;

  const first = body[0].getBoundingClientRect();
  const last = body[body.length - 1].getBoundingClientRect();
  const top = first.top + window.scrollY;
  const bottom = last.bottom + window.scrollY;
  const height = bottom - top;
  if (height <= 0) return 0;

  const viewportBottom = window.scrollY + window.innerHeight;
  return Math.min(1, Math.max(0, (viewportBottom - top) / height));
}

function devLog(event: string, detail: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  // Diagnostics only — no identifiers, no secrets, safe to leave visible
  // during development and trivial to strip before a production build.
  console.debug(`[read-tracking] ${event}`, detail);
}

// Tracks real foreground time-on-page and article-body scroll depth for this
// article. As soon as BOTH thresholds are met (see lib/read-tracking.ts) —
// the visitor does not need to leave or close the page first — it records
// one meaningful read via a single confirmed request. visibilitychange/
// pagehide remain only as a fallback check, guarded by the same `sent` flag,
// in case the thresholds are crossed right as the reader leaves.
export default function ReadTimeTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordViewMetrics(slug);
    let start = performance.now();
    let accumulated = 0;
    let visible = document.visibilityState === "visible";
    let sent = false;
    let maxScrollRatio = 0;

    function currentSeconds() {
      const live = visible ? performance.now() - start : 0;
      return (accumulated + live) / 1000;
    }

    async function record(seconds: number) {
      sent = true;
      markCounted(slug);

      try {
        const response = await fetch(`/api/read-time/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds }),
          keepalive: true,
        });
        const data = response.ok ? await response.json().catch(() => null) : null;
        devLog("read event", { status: "sent" });

        // Only ever reflect a server-confirmed count — never guess.
        if (typeof data?.sampleCount === "number") {
          window.dispatchEvent(new CustomEvent(READ_RECORDED_EVENT, { detail: { slug, sampleCount: data.sampleCount } }));
        }
      } catch {
        // Network failure — nothing critical depends on this succeeding
        // immediately; the anonymous dedupe key is already set, so we won't
        // retry-spam even though this attempt didn't land.
        devLog("read event", { status: "not sent (request failed)" });
      }
    }

    function evaluate() {
      if (sent) return;

      const seconds = currentSeconds();
      const meaningful = isMeaningfulRead({ seconds, scrollRatio: maxScrollRatio });

      devLog("evaluate", {
        timeThreshold: seconds >= MIN_READ_SECONDS ? "passed" : "not passed",
        scrollThreshold: maxScrollRatio >= MIN_BODY_SCROLL_RATIO ? "passed" : "not passed",
      });

      if (!meaningful) return;

      if (alreadyCountedRecently(slug)) {
        devLog("dedupe", { dedupe: "blocked" });
        sent = true; // already counted on this device recently — stop checking.
        return;
      }

      void record(seconds);
    }

    function onScroll() {
      const ratio = articleBodyScrollRatio();
      if (ratio > maxScrollRatio) maxScrollRatio = ratio;
      evaluate();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        accumulated += performance.now() - start;
        visible = false;
        evaluate();
      } else {
        start = performance.now();
        visible = true;
      }
    }

    onScroll();
    // Time alone (no further scrolling) can also cross the threshold, so
    // check on a light interval too — this is cheap local arithmetic, not
    // network polling.
    const pollId = setInterval(evaluate, 1000);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", evaluate);

    return () => {
      clearInterval(pollId);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", evaluate);
    };
  }, [slug]);

  return null;
}
