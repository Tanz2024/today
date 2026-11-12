import Link from "next/link";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";
import type { MetroPick } from "@/types/metro-pick";

function formatVerifiedDate(dateStr: string) {
  return clampToLaunch(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DISPLAY_TIME_ZONE });
}

// Renders nothing if there are no verified picks for this city — never shows
// fake/placeholder recommendations. See lib/metro-picks.ts for why the
// content file starts empty.
export default function MetroPicks({ picks }: { picks: MetroPick[]; cityLabel?: string }) {
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="metro-picks-heading" className="pt-2">
      
      <h2 id="metro-picks-heading" className="mt-2 font-heading text-[24px] font-semibold leading-[1.08] tracking-[-0.035em] text-near-black sm:text-[28px]">
        Places worth knowing this week.
      </h2>

      <div className="mt-4 grid gap-0 divide-y divide-card-border border-y border-card-border sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 sm:border-y-0 lg:grid-cols-3">
        {picks.map((pick) => (
          <a
            key={pick.id}
            href={pick.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2 py-4 transition-colors first:pt-4 sm:border-b sm:border-card-border sm:px-1 sm:py-5 lg:border-b-0"
          >
            <div className="flex flex-wrap gap-1.5">
              {pick.labels.map((label) => (
                <span key={label} className="text-[10px] font-semibold uppercase tracking-wide text-electric">
                  {label}
                </span>
              ))}
            </div>
            <h3 className="font-heading text-[18px] font-semibold text-near-black group-hover:text-electric">
              {pick.title}
            </h3>
            <p className="text-[13px] text-muted">
              {pick.location} · {pick.priceRange} · {pick.nearestTransit}
            </p>
            <p className="text-[14px] leading-[1.5] text-near-black">{pick.description}</p>
            <p className="mt-1 text-[11px] text-muted">Verified {formatVerifiedDate(pick.verifiedDate)}</p>
          </a>
        ))}
      </div>

      <Link href="/metro" className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-near-black hover:text-electric">
        Explore Global Picks →
      </Link>
    </section>
  );
}
