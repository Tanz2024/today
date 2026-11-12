import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { ArrowRight, Confetti, MapPin, MusicNotes } from "@phosphor-icons/react/ssr";

import PulsePoll from "@/components/pulse/PulsePoll";
import ShareAction from "@/components/ui/ShareAction";
import { getCategoryMeta } from "@/lib/categories";
import { getDailyDropStoryArticle } from "@/lib/daily-drop";
import type { DailyDrop as DailyDropData } from "@/types/daily-drop";
import type { Poll } from "@/lib/polls";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";
import { clampToLaunch } from "@/lib/launch";
import DailyDropProgress from "@/components/home/DailyDropProgress";

const RECOMMENDATION_ICON = {
  song: MusicNotes,
  place: MapPin,
  activity: Confetti,
} as const;

function formatDropDate(dateStr: string) {
  return clampToLaunch(`${dateStr}T00:00:00+08:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    // Drop dates are Malaysia calendar days; format them there rather than in
    // the server's timezone, which would show the previous day on UTC hosts.
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export default function DailyDrop({
  drop,
  article: resolvedArticle,
  isLatest,
  poll,
}: {
  drop: DailyDropData;
  /** Story article resolved by the caller, which can also see Appwrite-generated articles. */
  article?: Article;
  isLatest: boolean;
  poll?: Poll;
}) {
  const article = resolvedArticle ?? getDailyDropStoryArticle(drop);
  const meta = article ? getCategoryMeta(article.category) : undefined;
  const RecommendationIcon = RECOMMENDATION_ICON[drop.recommendationType];

 return (
    <section aria-labelledby="daily-drop-heading" className="py-2 sm:py-3">

    <h2
      id="daily-drop-heading"
      className="mt-2 max-w-[640px] font-heading text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-near-black sm:text-[28px] lg:text-[30px]"
    >
      <span className="mr-2 inline-block text-[10px] font-bold uppercase tracking-[.14em] text-electric align-middle">Daily Drop</span>{drop.storyTitle}
    </h2>

    <p className="mt-2 text-[14px] leading-[1.55] text-muted sm:text-[15px]">
      One worthwhile story, one useful find and one question — about five minutes.
    </p>

    <p className="mt-1 text-[10px] font-medium tracking-[0.09em] text-muted sm:mt-2">
      {isLatest ? "Latest Drop" : "Today’s Drop"} · {formatDropDate(drop.date)}
    </p>

    <DailyDropProgress date={drop.date} parts={[{ id: "story", label: "Read the story", href: drop.storyHref }, { id: "discovery", label: "Try the discovery", href: drop.recommendationHref, external: true }, ...(poll ? [{ id: "question", label: "Open the question", href: "#daily-drop-question" }] : [])]} />

    <div
      className={[
        "mt-3 grid gap-3 sm:mt-4 sm:gap-4 lg:items-start lg:gap-6",
        poll
          ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]"
          : "lg:grid-cols-1",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:gap-3 lg:col-start-1 lg:row-start-1 lg:gap-3 lg:border-b lg:border-card-border lg:pb-4">
        <Link href={drop.storyHref} className="group block">
          {article && (
            <div className="relative left-1/2 aspect-[16/9] w-screen -translate-x-1/2 overflow-hidden bg-[#f1f2f4] sm:left-auto sm:aspect-[21/9] sm:w-auto sm:translate-x-0 sm:rounded-[6px]">
              <Image
                src={article.image}
                alt={article.imageAlt}
                fill
                sizes={
                  poll
                    ? "(max-width: 1024px) 100vw, 700px"
                    : "(max-width: 1024px) 100vw, 1400px"
                }
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
              />
            </div>
          )}

          <div className="mt-3">
            {(meta || article) && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted">
                {meta?.name ?? article?.category} ·{" "}
                {article ? formatArticleRecency(article.date) : "JUST NOW"}
              </p>
            )}

            <p className="mt-1.5 line-clamp-2 text-[14px] leading-[1.5] text-muted sm:mt-2 sm:text-[15px] sm:leading-[1.55]">
              {drop.storySummary}
            </p>

            <span className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-near-black group-hover:text-electric sm:mt-3">
              Read the full story
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </div>
        </Link>

      </div>

      <div className="hidden gap-0 border-t border-card-border pt-2 sm:grid lg:col-span-2 lg:row-start-2 lg:gap-5">
        <div className="flex items-start gap-2.5 border-card-border pt-5 sm:gap-3 sm:pt-0 lg:border-l lg:pl-5">
          <div className="group flex min-w-0 flex-1 items-center gap-2.5 sm:items-start sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted sm:text-[11px]">
                <RecommendationIcon size={16} aria-hidden className="shrink-0 text-electric" />
                <span className="sm:hidden">Today&apos;s pick</span>
                <span className="hidden sm:inline">Soundtrack for this drop</span>
              </p>
              <a href={drop.recommendationHref} target="_blank" rel="noopener noreferrer" className="block">
                <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[1.3] text-near-black group-hover:text-electric sm:line-clamp-none sm:text-[17px] sm:leading-[1.25]">{drop.recommendationTitle}</p>
                <p className="mt-1 line-clamp-3 text-[13px] leading-[1.45] text-muted sm:line-clamp-2">{drop.recommendationDescription}</p>
              </a>
            </div>
          </div>
          <ShareAction title="Today&apos;s pick" text={`${drop.recommendationTitle} — today&apos;s pick on BrisaStory.`} url={drop.recommendationHref} compactOnMobile className="shrink-0 sm:hidden" />
        </div>
      </div>

      {poll && (
        <div id="daily-drop-question" tabIndex={-1} className="scroll-mt-24 border-t border-card-border pt-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric sm:pt-5 lg:col-start-2 lg:row-start-1 lg:border-b lg:border-l lg:border-t-0 lg:pb-6 lg:pl-8 lg:pt-0">
          <div>
            <PulsePoll
              poll={poll}
              layout="stacked"
              resultsLink={{
                label: "View results →",
                href: "/pulse",
              }}
            />
          </div>
        </div>
      )}
    </div>
  </section>
);
}
