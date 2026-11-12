"use client";

import { useEffect, useRef, useState } from "react";
import { getAdSlotId, type AdSlotKey } from "@/lib/adsense";

const dimensions: Record<AdSlotKey, string> = {
  "article-midpoint": "min-h-[180px] sm:min-h-[220px]",
  "category-boundary": "min-h-[160px] sm:min-h-[200px]",
  "homepage-boundary": "min-h-[160px] sm:min-h-[200px]",
};

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

export default function AdSlot({ slot, className = "", desktopOnly = false }: { slot: AdSlotKey; className?: string; desktopOnly?: boolean }) {
  const [desktopReady, setDesktopReady] = useState(!desktopOnly);
  const [nearViewport, setNearViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const slotId = getAdSlotId(slot);

  useEffect(() => {
    if (!desktopOnly) return;
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktopReady(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [desktopOnly]);

  useEffect(() => {
    if (!desktopReady || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [desktopReady]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ADS_ENABLED !== "true" || !slotId || !desktopReady || !nearViewport || initializedRef.current) return;
    initializedRef.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, [desktopReady, nearViewport, slotId]);

  if (process.env.NEXT_PUBLIC_ADS_ENABLED !== "true" || !slotId || !desktopReady) return null;

  return (
    <div
      ref={containerRef}
      role="complementary"
      aria-label="Advertisement"
      className={`flex w-full flex-col items-center justify-center border-y border-black/[0.08] bg-[#fafafa] px-6 py-6 text-center ${dimensions[slot]} ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#85888f]">Advertisement</span>
      <ins className="adsbygoogle block min-h-[90px] w-full" style={{ display: "block" }} data-ad-client="ca-pub-5814338716030863" data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
