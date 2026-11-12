"use client";

import { useEffect, useState } from "react";
import { BookmarkSimple, Check, Eye, TextAa, X } from "@phosphor-icons/react";
import { formatReadCount, READ_RECORDED_EVENT } from "@/lib/read-tracking";

const FONT_SIZES = [
  { size: 18, symbol: "A−", label: "Default" },
  { size: 20, symbol: "A", label: "Large" },
  { size: 22, symbol: "A+", label: "Extra large" },
] as const;
const READER_SIZE_KEY = "brisastory:readerTextSize";

export default function MobileReaderTools({
  slug,
  minutes,
  reads,
}: {
  slug: string;
  minutes: number;
  // Real count from read_stats.sampleCount only (see lib/read-stats.ts).
  // 0 is a genuine "no reads yet" and is shown as-is. null/undefined means
  // the stat genuinely couldn't be fetched (e.g. Appwrite unreachable), in
  // which case the metric is hidden rather than showing a guessed value.
  reads?: number | null;
}) {
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [liveReads, setLiveReads] = useState(reads);
  // Starts hidden: the original inline Save/Share row is on screen at the
  // top of the article, so the sticky toolbar has nothing to add yet.
  const [toolbarVisible, setToolbarVisible] = useState(false);

  useEffect(() => {
    const topControls = document.getElementById("article-top-controls");
    const bodyEnd = document.getElementById("article-body-end");
    if (!topControls || !bodyEnd) return;

    let topControlsVisible = true;
    let pastArticleEnd = false;

    const sync = () => {
      const visible = !topControlsVisible && !pastArticleEnd;
      setToolbarVisible(visible);
      if (!visible) setSettingsOpen(false);
    };

    // A small rootMargin keeps both edges from flickering as the reader
    // scrolls slowly past them.
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        topControlsVisible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    const endObserver = new IntersectionObserver(
      ([entry]) => {
        // Reached the end once the sentinel is visible, or once we've
        // scrolled far enough that it's already above the viewport.
        pastArticleEnd = entry.isIntersecting || entry.boundingClientRect.top < 0;
        sync();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    topObserver.observe(topControls);
    endObserver.observe(bodyEnd);
    return () => {
      topObserver.disconnect();
      endObserver.disconnect();
    };
  }, [slug]);

  useEffect(() => {
    function onSaveChanged(event: Event) {
      const detail = (event as CustomEvent<{ slug: string; saved: boolean }>).detail;
      if (detail?.slug === slug) setSaved(detail.saved);
    }
    window.addEventListener("brisastory:save-changed", onSaveChanged);
    return () => window.removeEventListener("brisastory:save-changed", onSaveChanged);
  }, [slug]);

  useEffect(() => {
    // Only ever reflects a server-confirmed sampleCount (dispatched by
    // ReadTimeTracker after a successful write) — never an optimistic guess.
    function onRecorded(event: Event) {
      const detail = (event as CustomEvent<{ slug: string; sampleCount: number }>).detail;
      if (detail?.slug === slug && typeof detail.sampleCount === "number") {
        setLiveReads(detail.sampleCount);
      }
    }
    window.addEventListener(READ_RECORDED_EVENT, onRecorded);
    return () => window.removeEventListener(READ_RECORDED_EVENT, onRecorded);
  }, [slug]);

  useEffect(() => {
    const savedArticle = localStorage.getItem(`brisastory:saved:${slug}`) === "1";
    const storedSize = Number(localStorage.getItem(READER_SIZE_KEY));
    queueMicrotask(() => {
      setSaved(savedArticle);
      if (FONT_SIZES.some((option) => option.size === storedSize)) setFontSize(storedSize);
    });

    // Progress is measured against the article body only — related
    // stories, reactions, author info and the footer never count toward it.
    const update = () => {
      const body = document.querySelectorAll<HTMLElement>(".article-reading-content");
      if (body.length === 0) return;

      const first = body[0].getBoundingClientRect();
      const last = body[body.length - 1].getBoundingClientRect();
      const top = first.top + window.scrollY;
      const bottom = last.bottom + window.scrollY;
      const height = bottom - top;

      const next = height > 0 ? Math.min(100, Math.max(0, ((window.scrollY - top + window.innerHeight * 0.5) / height) * 100)) : 0;
      setProgress(next);
      if (next > 3) localStorage.setItem(`brisastory:position:${slug}`, String(window.scrollY));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slug]);

  useEffect(() => {
    const content = document.querySelectorAll<HTMLElement>(".article-reading-content");
    content.forEach((el) => { el.style.fontSize = `${fontSize}px`; });
    const scale = fontSize / 18;
    document.querySelector<HTMLElement>(".article-scale")?.style.setProperty("--read-scale", String(scale));
    localStorage.setItem(READER_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    if (next) localStorage.setItem(`brisastory:saved:${slug}`, "1");
    else localStorage.removeItem(`brisastory:saved:${slug}`);
    window.dispatchEvent(new CustomEvent("brisastory:save-changed", { detail: { slug, saved: next } }));
  }

  const minutesLeft = Math.max(0, Math.ceil(minutes * (1 - progress / 100)));

  return (
    <>
    <div
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden ${
        toolbarVisible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!toolbarVisible}
    >
      <div className="h-[2px] w-full bg-black/[0.06]">
        <div className="h-full bg-electric/70 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>

      <div
        className="flex items-center justify-between border-t border-card-border bg-background px-5 pt-2.5 text-[#858a94]"
        style={{ paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))" }}
        aria-label="Reader tools"
      >
        <button type="button" onClick={toggleSaved} className="inline-flex min-h-11 min-w-11 items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-near-black" aria-pressed={saved}>
          {saved ? <Check size={16} weight="bold" aria-hidden /> : <BookmarkSimple size={16} aria-hidden />}
          <span>{saved ? "Saved" : "Save"}</span>
        </button>

        <span className="text-[11px] text-muted">
          {minutesLeft > 0 ? `${minutesLeft} min left` : "0 min left"}
        </span>

        <button type="button" onClick={() => setSettingsOpen(true)} className="relative inline-flex min-h-11 min-w-11 items-center justify-center text-muted transition-colors hover:text-near-black" aria-label={`Reading settings, current text size ${FONT_SIZES.find((option) => option.size === fontSize)?.label ?? "Default"}`}>
          <TextAa size={19} aria-hidden />
          {fontSize > 18 && <span className="absolute right-0.5 top-1 font-mono text-[9px] leading-none text-muted/70">{fontSize === 22 ? "+ +" : "+"}</span>}
        </button>

        {typeof liveReads === "number" && liveReads >= 50 && (
          <span
            className="inline-flex min-h-11 items-center gap-1.5 text-[11px] text-muted"
            title={`${liveReads.toLocaleString()} article reads`}
            aria-label={`${liveReads.toLocaleString()} article reads`}
          >
            <Eye size={15} aria-hidden />
            {formatReadCount(liveReads)}
          </span>
        )}
      </div>
    </div>

      {settingsOpen && (
        <>
          <button
            type="button"
            aria-label="Close reading settings"
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 border-t border-card-border bg-background px-6 pt-5"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-label="Reading settings"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Reading settings</p>
              <button type="button" onClick={() => setSettingsOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center text-muted" aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <p className="mt-5 text-[13px] text-muted">Text size</p>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {FONT_SIZES.map(({ size, symbol, label }) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => { setFontSize(size); setSettingsOpen(false); }}
                  aria-pressed={fontSize === size}
                  className={`flex min-h-11 flex-col items-center gap-1 border py-3 transition-colors ${
                    fontSize === size ? "border-near-black" : "border-card-border"
                  }`}
                >
                  <span className={`font-heading text-[17px] ${fontSize === size ? "text-near-black" : "text-muted"}`}>{symbol}</span>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
