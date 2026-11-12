"use client";

import { useState } from "react";
import type { TocItem } from "@/lib/toc";

export default function TableOfContents({
  items,
  numbered = true,
}: {
  items: TocItem[];
  numbered?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sections = items.filter(
    (item) => item.level === 2,
  );

  /*
   * A short lifestyle article does not need navigation
   * before the reader has even started reading.
   */
  if (sections.length < 5) {
    return null;
  }

  return (
    <nav
      aria-label="In this story"
      className="
        border-y border-card-border
        py-2
        sm:py-7
      "
    >
      <details open className="group/toc">
        <summary
          className="
            flex min-h-11 cursor-pointer list-none items-center justify-between py-3
            text-[11px] font-semibold uppercase tracking-[0.13em]
            text-muted
            marker:content-none
            [&::-webkit-details-marker]:hidden
            sm:pointer-events-none sm:cursor-default sm:py-0
          "
        >
          In this story
          <span aria-hidden="true" className="text-[13px] transition-transform duration-200 group-open/toc:rotate-180 sm:hidden">
            ⌄
          </span>
        </summary>

        <div className="sm:mt-4">
          <ol>
        {sections.map((item, index) => (
          <li
            key={item.id}
            className={`
              border-t border-card-border
              first:border-t-0
              ${index >= 5 && !expanded ? "hidden sm:list-item" : ""}
            `}
          >
            <a
              href={`#${item.id}`}
              className="
                group/row
                flex min-h-[46px]
                items-start gap-4
                py-3
                text-[calc(15px*var(--read-scale,1))]
                leading-[1.45]
                text-near-black
                transition-colors
                duration-150
                hover:text-electric
                sm:text-[16px]
              "
            >
              {numbered && (
                <span
                  className="
                    mt-[2px]
                    w-6 shrink-0
                    font-mono
                    text-[calc(10px*var(--read-scale,1))]
                    text-muted
                  "
                >
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>
              )}

              <span className="flex-1">
                {item.text}
              </span>

              <span
                aria-hidden="true"
                  className="
                    shrink-0 text-[10px] text-muted/60 sm:text-[13px]
                  transition-transform
                  duration-200
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  group-hover/row:translate-x-1
                  group-hover/row:text-electric
                "
              >
                ↓
              </span>
            </a>
          </li>
        ))}
          </ol>
          {sections.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-2 min-h-11 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted hover:text-electric sm:hidden"
              aria-expanded={expanded}
            >
              {expanded ? "Show fewer sections" : "Show all sections"}
            </button>
          )}
        </div>
      </details>
    </nav>
  );
}
