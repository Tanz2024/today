"use client";

import { useRef, useState } from "react";
import Image from "@/components/ui/MediaImage";
import Link from "next/link";

import type { OnScreenItem, OnScreenSection } from "@/lib/on-screen";
import { onScreenChart } from "@/lib/on-screen";
import { wrapTabIndex } from "@/lib/tab-navigation";

const TABS: { section: OnScreenSection; label: string }[] = [
  { section: "Anime", label: "Anime" },
  { section: "Movies", label: "Movies" },
  { section: "Trending TV", label: "Series" },
];

function getHref(item: OnScreenItem) {
  return item.watchUrl ?? item.tmdbUrl ?? onScreenChart.sourceUrl;
}

function getTypeLabel(item: OnScreenItem, section: OnScreenSection) {
  if (section === "Anime") return "Anime";
  return item.mediaType === "movie" ? "Movie" : "Series";
}

function tabId(section: OnScreenSection) {
  return `on-screen-tab-${section.toLowerCase().replace(/\s+/g, "-")}`;
}

function panelId(section: OnScreenSection) {
  return `on-screen-panel-${section.toLowerCase().replace(/\s+/g, "-")}`;
}

// Accessible tab pattern (no library — just roving tabindex + arrow keys),
// used only on mobile/tablet. Desktop keeps the existing three-column layout.
export default function OnScreenMobileTabs({ items }: { items: OnScreenItem[] }) {
  const [active, setActive] = useState<OnScreenSection>("Anime");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(index: number) {
    const wrapped = wrapTabIndex(index, TABS.length);
    const section = TABS[wrapped].section;
    setActive(section);
    tabRefs.current[section]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  const sectionItems = items.filter((item) => item.section === active).slice(0, 3);
  const [lead, ...compact] = sectionItems;

  return (
    <div className="lg:hidden">
      <div role="tablist" aria-label="Watch by category" className="flex gap-1 border-b border-black/[0.09]">
        {TABS.map(({ section, label }, index) => {
          const selected = active === section;
          return (
            <button
              key={section}
              ref={(el) => {
                tabRefs.current[section] = el;
              }}
              type="button"
              role="tab"
              id={tabId(section)}
              aria-selected={selected}
              aria-controls={panelId(section)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(section)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`min-h-11 flex-1 border-b-2 px-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-electric ${
                selected
                  ? "border-electric text-near-black"
                  : "border-transparent text-muted [@media(hover:hover)]:hover:text-near-black"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        id={panelId(active)}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        tabIndex={0}
        className="pt-6"
      >
        {lead && <MobileLead item={lead} section={active} />}

        {compact.length > 0 && (
          <div className="mt-2 border-t border-black/[0.09]">
            {compact.map((item) => (
              <MobileCompact key={`${active}-${item.rank}-${item.title}`} item={item} section={active} />
            ))}
          </div>
        )}

        <Link
          href={lead ? getHref(lead) : onScreenChart.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center text-[13px] font-semibold text-near-black underline underline-offset-2"
        >
          Explore more
        </Link>
      </div>
    </div>
  );
}

function MobileLead({ item, section }: { item: OnScreenItem; section: OnScreenSection }) {
  return (
    <Link
      href={getHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[100px_1fr] gap-4"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#f1f2f4]">
        {item.posterUrl ? (
          <Image src={item.posterUrl} alt={`${item.title} poster`} fill sizes="100px" className="object-cover" />
        ) : (
          <PosterFallback title={item.title} />
        )}
      </div>

      <div className="self-center">
        <p className="text-[10px] uppercase tracking-[0.07em] text-[#585c63]">
          {getTypeLabel(item, section)}
        </p>
        <h4 className="mt-1.5 font-heading text-[19px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#111111] transition-colors group-hover:text-[#2563EB]">
          {item.title}
        </h4>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-[#696c73]">{item.editorNote}</p>
      </div>
    </Link>
  );
}

function MobileCompact({ item, section }: { item: OnScreenItem; section: OnScreenSection }) {
  return (
    <Link
      href={getHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid min-h-[46px] grid-cols-[1fr_auto] items-center gap-4 border-b border-black/[0.09] py-4 last:border-b-0"
    >
      <div>
        <h4 className="line-clamp-1 font-heading text-[15px] font-medium leading-[1.2] text-[#111111] group-hover:text-[#2563EB]">
          {item.title}
        </h4>
        <p className="mt-1 text-[11px] uppercase tracking-[0.07em] text-[#585c63]">
          {getTypeLabel(item, section)}
        </p>
      </div>
    </Link>
  );
}

function PosterFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-end bg-[#eeeeec] p-2">
      <p className="line-clamp-3 text-[10px] font-semibold leading-tight text-[#585c63]">{title}</p>
    </div>
  );
}
