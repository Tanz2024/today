"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function MobileReadingTreatment({
  preview,
  remaining,
  remainingMinutes,
}: {
  preview: ReactNode;
  remaining: ReactNode;
  remainingMinutes: number;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".mobile-long-form").forEach((element) => element.classList.add("mobile-long-form-ready"));
  }, []);

  return (
    <div className={`mobile-long-form ${expanded ? "mobile-long-form-expanded" : ""}`}>
      <div className="relative mobile-long-form-preview">
        {preview}
        {!expanded && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent sm:hidden" />}
      </div>

      <div className={`mobile-long-form-control relative z-10 -mt-3 justify-center bg-background pb-5 pt-2 ${expanded ? "hidden" : "flex"}`}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex min-h-11 items-center justify-center border border-card-border px-5 text-center text-sm font-semibold text-near-black transition-colors hover:border-electric hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric"
          aria-expanded={expanded}
        >
          <span>
            Continue reading
            <span className="mt-1 block text-xs font-normal text-muted">{remainingMinutes} min left</span>
          </span>
        </button>
      </div>

      <div className={`mobile-long-form-remaining ${expanded ? "mobile-long-form-remaining-expanded" : ""}`}>
        {remaining}
      </div>
    </div>
  );
}

export function MobileReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const start = document.getElementById("article-body-start");
      const end = document.getElementById("article-body-end");
      if (!start || !end) return;
      const range = end.offsetTop - start.offsetTop - window.innerHeight;
      const value = range <= 0 ? 1 : (window.scrollY - start.offsetTop) / range;
      setProgress(Math.min(1, Math.max(0, value)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <div aria-hidden="true" className="mobile-reading-progress fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent"><div className="h-full bg-electric transition-[width] duration-100" style={{ width: `${progress * 100}%` }} /></div>;
}
