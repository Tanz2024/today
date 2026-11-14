"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Below this width the tools list is a one-card carousel; above it, the normal grid. */
const MOBILE_QUERY = "(max-width: 767px)";
/** Time each tool stays on screen before the carousel moves on. */
const AUTO_ADVANCE_MS = 4000;
/** After the reader swipes, taps or focuses a tool, wait this long before auto-advancing again. */
const RESUME_AFTER_MS = 8000;

/**
 * Homepage AI tools list.
 *
 * - Tablet and laptop: the original grid (pure CSS, no JavaScript involved).
 * - Phone: a swipeable carousel showing one tool at a time. It advances by one
 *   tool every few seconds and loops, but pauses while the reader is
 *   interacting, while it is off screen or the tab is hidden, and never runs
 *   for readers who prefer reduced motion.
 *
 * The tool links are server-rendered children, so everything works without JS.
 */
export default function ToolsCarousel({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const pausedUntil = useRef(0);
  const inView = useRef(false);

  const indexFromScroll = useCallback(() => {
    const el = track.current;
    if (!el || !el.clientWidth) return 0;
    return Math.round(el.scrollLeft / el.clientWidth);
  }, []);

  const goTo = useCallback((index: number) => {
    const el = track.current;
    const item = el?.children[index] as HTMLElement | undefined;
    if (!el || !item) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: item.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  // Track the breakpoint.
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Keep the position dots in step with swipes.
  useEffect(() => {
    const el = track.current;
    if (!el || !isMobile) return;
    const onScroll = () => setActive(indexFromScroll());
    const pause = () => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", pause, { passive: true });
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("focusin", pause);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("focusin", pause);
    };
  }, [isMobile, indexFromScroll]);

  // Only auto-advance while the carousel is actually visible.
  useEffect(() => {
    const el = track.current;
    if (!el || !isMobile || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { inView.current = entry.isIntersecting && entry.intersectionRatio >= 0.6; }, { threshold: [0, 0.6, 1] });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile]);

  // Auto-advance one tool at a time, looping back to the first.
  useEffect(() => {
    if (!isMobile || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden || !inView.current || Date.now() < pausedUntil.current) return;
      goTo((indexFromScroll() + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isMobile, count, goTo, indexFromScroll]);

  return (
    <div className="tools-carousel" role="region" aria-roledescription={isMobile ? "carousel" : undefined} aria-label={label}>
      <ul ref={track} className="home-tools-grid">
        {children}
      </ul>
      {count > 1 ? (
        <div className="tools-carousel-dots" role="group" aria-label="Choose a tool">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              className="tools-carousel-dot"
              aria-label={`Show tool ${index + 1} of ${count}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; goTo(index); }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
