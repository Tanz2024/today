import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";

import type { OnScreenItem } from "@/lib/on-screen";
import { onScreenChart } from "@/lib/on-screen";
import OnScreenMobileTabs from "@/components/home/OnScreenMobileTabs";

const SECTIONS = ["Anime", "Movies", "Trending TV"] as const;

type SectionName = (typeof SECTIONS)[number];

function getHref(item: OnScreenItem) {
  return (
    item.watchUrl ??
    item.tmdbUrl ??
    onScreenChart.sourceUrl
  );
}

function getTypeLabel(
  item: OnScreenItem,
  section: SectionName,
) {
  if (section === "Anime") {
    return "Anime";
  }

  return item.mediaType === "movie"
    ? "Movie"
    : "Series";
}

export default function OnScreen({
  items,
}: {
  items: OnScreenItem[];
}) {
  return (
    <section
      aria-labelledby="on-screen-heading"
      className="
        pt-2
      "
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header
        className="
          flex
          flex-col
          gap-4
          pb-5
          sm:flex-row
          sm:items-end
          sm:justify-between
          sm:pb-6
        "
      >
        <div>

          <h2
            id="on-screen-heading"
            className="
              mt-2
              font-heading
              text-[26px]
              font-semibold
              leading-[1.04]
              tracking-[-0.04em]
              text-[#111111]
              sm:text-[32px]
              lg:text-[36px]
            "
          >
            What&apos;s worth watching.
          </h2>
          {items[0]?.editionWeek && <p className="mt-2 text-sm text-muted">Week of {clampToLaunch(items[0].editionWeek).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: DISPLAY_TIME_ZONE })}</p>}
        </div>

      </header>

      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <div
        className="
          mt-8
          hidden
          grid-cols-3
          lg:grid
        "
      >
        {SECTIONS.map(
          (section, sectionIndex) => {
            const sectionItems =
              items
                .filter(
                  (item) =>
                    item.section ===
                    section,
                )
                .slice(0, 3);

            const [lead, ...rest] =
              sectionItems;

            return (
              <section
                key={section}
                aria-labelledby={`on-screen-${section
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className={`
                  min-w-0
                  ${
                    sectionIndex === 0
                      ? "pr-8"
                      : "border-l border-black/[0.09] px-8"
                  }
                  ${
                    sectionIndex ===
                    SECTIONS.length - 1
                      ? "pr-0"
                      : ""
                  }
                `}
              >
                <div
                  className="
                    flex
                    min-h-[34px]
                    items-start
                    justify-between
                    gap-4
                  "
                >
                  <h3
                    id={`on-screen-${section
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.13em]
                      text-[#585c63]
                    "
                  >
                    {section}
                  </h3>

                </div>

                {lead && (
                  <LeadItem
                    item={lead}
                    section={section}
                  />
                )}

                {rest.length > 0 && (
                  <div
                    className="
                      mt-7
                      border-t
                      border-black/[0.09]
                    "
                  >
                    {rest.map((item) => (
                      <CompactItem
                        key={`${section}-${item.rank}-${item.title}`}
                        item={item}
                        section={section}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          },
        )}
      </div>

      {/* =====================================================
          MOBILE / TABLET

          Accessible tabs (Anime / Movies / Series) instead of three
          stacked lists — only the active category's top 3 items render.
      ====================================================== */}

      <div className="mt-6 lg:hidden">
        <OnScreenMobileTabs items={items} />
      </div>

    </section>
  );
}

/* =========================================================
   DESKTOP LEAD
========================================================= */

function LeadItem({
  item,
  section,
}: {
  item: OnScreenItem;
  section: SectionName;
}) {
  const href = getHref(item);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group
        mt-4
        block
      "
    >
      <div
        className="
          relative
          aspect-[2/3]
          w-full
          overflow-hidden
          bg-[#f1f2f4]
        "
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={`${item.title} poster`}
            fill
            sizes="(max-width: 1280px) 30vw, 390px"
            className="
              object-cover
              transition
              duration-300
              ease-[cubic-bezier(0.22,1,0.36,1)]
              group-hover:opacity-90
            "
          />
        ) : (
          <PosterFallback
            title={item.title}
          />
        )}
      </div>

      <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#585c63]">
          {getTypeLabel(
            item,
            section,
          )}
        </p>

        <h4
          className="
            mt-2
            font-heading
            text-[25px]
            font-semibold
            leading-[1.08]
            tracking-[-0.03em]
            text-[#111111]
            transition-colors
            duration-150
            group-hover:text-[#2563EB]
          "
        >
          {item.title}
        </h4>

        {item.season && (
          <p
            className="
              mt-1
              text-[12px]
              text-[#585c63]
            "
          >
            {item.season}
          </p>
        )}

        <p
          className="
            mt-3
            max-w-[370px]
            text-[14px]
            leading-[1.55]
            text-[#4b4f56]
          "
        >
          {item.editorNote}
        </p>
      </div>
    </Link>
  );
}

/* =========================================================
   DESKTOP COMPACT
========================================================= */

function CompactItem({
  item,
  section,
}: {
  item: OnScreenItem;
  section: SectionName;
}) {
  return (
    <Link
      href={getHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group
        grid
        grid-cols-[64px_1fr]
        gap-4
        border-b
        border-black/[0.09]
        py-5
        last:border-b-0
      "
    >
      <div
        className="
          relative
          aspect-[2/3]
          overflow-hidden
          bg-[#f1f2f4]
        "
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={`${item.title} poster`}
            fill
            sizes="64px"
            className="
              object-cover
              transition-opacity
              duration-200
              group-hover:opacity-85
            "
          />
        ) : (
          <PosterFallback
            title={item.title}
          />
        )}
      </div>

      <div
        className="
          min-w-0
          self-center
        "
      >
        <h4
          className="
            mt-1
            line-clamp-2
            font-heading
            text-[17px]
            font-medium
            leading-[1.15]
            tracking-[-0.02em]
            text-[#111111]
            transition-colors
            group-hover:text-[#2563EB]
          "
        >
          {item.title}
        </h4>

        <p
          className="
            mt-2
            text-[10px]
            font-medium
            uppercase
            tracking-[0.08em]
            text-[#585c63]
          "
        >
          {getTypeLabel(
            item,
            section,
          )}
        </p>
      </div>
    </Link>
  );
}

/* =========================================================
   MOBILE LEAD/COMPACT — see OnScreenMobileTabs.tsx
========================================================= */

/* =========================================================
   FALLBACK
========================================================= */

function PosterFallback({
  title,
}: {
  title: string;
}) {
  return (
    <div
      className="
        flex
        h-full
        w-full
        items-end
        bg-[#eeeeec]
        p-3
      "
    >
      <span
        className="
          font-heading
          text-[11px]
          font-medium
          leading-[1.3]
          text-[#777a80]
        "
      >
        {title}
      </span>
    </div>
  );
}
