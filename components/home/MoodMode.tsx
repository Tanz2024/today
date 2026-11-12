"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MoodModeChips from "@/components/home/MoodModeChips";
import MoodResultsDesktop from "@/components/home/MoodResultsDesktop";
import TrendingCarouselMobile from "@/components/home/TrendingCarouselMobile";
import { MOOD_OPTIONS } from "@/lib/mood-options";
import type { ArticleCardData, MoodTag } from "@/types/article";

export default function MoodMode({
  results,
}: {
  results: ArticleCardData[];
}) {
  const searchParams = useSearchParams();
  const queryMood = searchParams.get("mood");
  const activeMood = MOOD_OPTIONS.some((option) => option.value === queryMood) ? queryMood as MoodTag : null;
  const [loadedResults, setLoadedResults] = useState<ArticleCardData[]>(results);

  useEffect(() => {
    if (!activeMood) return;
    let cancelled = false;
    fetch(`/api/mood?mood=${encodeURIComponent(activeMood)}`)
      .then((response) => response.ok ? response.json() : { articles: [] })
      .then((data: { articles?: ArticleCardData[] }) => { if (!cancelled) setLoadedResults(data.articles ?? []); })
      .catch(() => { if (!cancelled) setLoadedResults([]); });
    return () => { cancelled = true; };
  }, [activeMood]);

  const visibleResults = activeMood ? loadedResults : [];

  const label = activeMood ? MOOD_OPTIONS.find((option) => option.value === activeMood)?.label : null;

  return (
    <section id="mood-mode" aria-labelledby="mood-mode-heading" className="pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#585c63]">Find your next read</p>
      <h2 id="mood-mode-heading" className="mt-2 font-heading text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-near-black sm:text-[29px]">
        Pick a mood to filter stories.
      </h2>

      <div className="mt-4 sm:mt-4">
        <MoodModeChips selected={activeMood} />
      </div>

      {activeMood && (
        <div className="mt-7 sm:mt-6">
          {visibleResults.length > 0 ? (
            <>
              <p className="text-[13px] text-muted">Showing stories for &ldquo;{label}&rdquo;</p>

              <div className="mt-4">
              <TrendingCarouselMobile articles={visibleResults} />
              </div>

              <div className="mt-4">
                <MoodResultsDesktop articles={visibleResults} />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted">
              Nothing tagged for that mood yet —{" "}
              <Link href="/topics" className="font-semibold text-electric hover:underline">
                browse all topics
              </Link>{" "}
              instead.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
