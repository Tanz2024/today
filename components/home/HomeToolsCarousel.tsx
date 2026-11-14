"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { toolIcon } from "@/components/discovery/Cards";

import type { CatalogTool } from "@/lib/site-catalog";

const PER_PAGE = 3;
const shortName = (title: string) => title.replace(/^AI /, "").replace("Writing & Paraphrasing Studio", "Writing Studio").replace("Resume & Job Application Assistant", "Resume Assistant").replace("Image & Document Studio", "Image Studio");

/**
 * Tools in pages of exactly three: stacked on phones, side by side from
 * tablet up. Only whole pages are shown, so no card is ever cut off.
 */
export default function HomeToolsCarousel({ tools }: { tools: CatalogTool[] }) {
  const pages = Array.from({ length: Math.ceil(tools.length / PER_PAGE) }, (_, i) => tools.slice(i * PER_PAGE, i * PER_PAGE + PER_PAGE));
  const [page, setPage] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  if (!pages.length) return null;
  const current = Math.min(page, pages.length - 1);
  // A horizontal swipe moves one whole page of three.
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    setPage((current + (dx < 0 ? 1 : -1) + pages.length) % pages.length);
  };

  return (
    <div className="hp-carousel" role="region" aria-roledescription="carousel" aria-label="Free AI tools" tabIndex={-1} onKeyDown={(event) => { if (event.key === "ArrowRight") setPage((current + 1) % pages.length); if (event.key === "ArrowLeft") setPage((current - 1 + pages.length) % pages.length); }}>
      <ul key={current} className="hp-carousel-page" aria-live="polite" onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={onTouchEnd}>
        {pages[current].map((tool) => {
          const Icon = toolIcon(tool);
          return (
          <li key={tool.href}>
            <Link href={tool.href} className="hp-tool">
              <span className="hp-tool-icon" aria-hidden="true"><Icon size={32} weight="duotone" /></span>
              <span className="hp-tool-copy">
                <span className="hp-tool-name">{shortName(tool.title)}</span>
                <span className="hp-tool-line">{tool.tagline ?? tool.description}</span>
              </span>
              <ArrowRight size={16} weight="bold" className="hp-tool-arrow" aria-hidden="true" />
            </Link>
          </li>
          );
        })}
        {/* Keep a short last page the same height as a full one. */}
        {Array.from({ length: PER_PAGE - pages[current].length }, (_, i) => <li key={`filler-${i}`} className="is-filler" aria-hidden="true" />)}
      </ul>
      {pages.length > 1 ? (
        <div className="hp-carousel-nav">
          <div className="hp-carousel-dots">
            {pages.map((_, i) => (
              <button key={i} type="button" className="hp-carousel-dot" aria-label={`Tools ${i * PER_PAGE + 1}–${Math.min(tools.length, (i + 1) * PER_PAGE)}`} aria-current={i === current ? "true" : undefined} onClick={() => setPage(i)}><span /></button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
