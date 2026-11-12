"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/MediaImage";

import { getCategoryMeta } from "@/lib/categories";
import type { ArticleCardData } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

// Manual swipe only — no autoplay. Native scroll-snap does the heavy
// lifting; this just tracks which card is currently snapped so the
// pagination dots can reflect it.
export default function TrendingCarouselMobile({ articles }: { articles: ArticleCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || articles.length <= 1) return;

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const trackEl = trackRef.current;
        if (!trackEl) return;

        const trackCenter = trackEl.scrollLeft + trackEl.clientWidth / 2;
        let closest = 0;
        let closestDistance = Infinity;

        cardRefs.current.forEach((card, index) => {
          if (!card) return;
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const distance = Math.abs(cardCenter - trackCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = index;
          }
        });

        setActive(closest);
      });
    }

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [articles.length]);

  if (articles.length === 0) return null;

  if (articles.length === 1) {
    return (
      <div className="sm:hidden">
      <TrendingCard article={articles[0]} className="w-full" />
      </div>
    );
  }

  return (
    <div className="sm:hidden">
      <div
        ref={trackRef}
        className="-mx-4 flex touch-pan-x snap-x snap-mandatory gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {articles.map((article, index) => (
          <div
            key={article.slug}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="w-screen shrink-0 snap-start"
          >
            <TrendingCard article={article} textInset />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Trending story position">
        {articles.map((article, index) => (
          <span
            key={article.slug}
            role="tab"
            aria-selected={index === active}
            aria-label={`Story ${index + 1} of ${articles.length}`}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              index === active ? "w-4 bg-near-black" : "w-1.5 bg-black/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function TrendingCard({
  article,
  priority = false,
  className = "",
  textInset = false,
}: {
  article: ArticleCardData;
  priority?: boolean;
  className?: string;
  // The carousel's images bleed to the true screen edge (no page gutter),
  // but the text below still needs the normal inset to stay readable.
  textInset?: boolean;
}) {
  const meta = getCategoryMeta(article.category);

  return (
    <Link href={`/${article.category}/${article.slug}`} className={`group block ${className}`}>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f1f2f4]">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className={`mt-3 ${textInset ? "px-4" : ""}`}>
        <p className="flex items-center gap-x-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#585c63]">
          {meta && <span>{meta.name}</span>}
          {meta && <span aria-hidden="true" className="text-black/25">·</span>}
          <span>{formatArticleRecency(article.date)}</span>
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-heading text-[19px] font-semibold leading-[1.2] tracking-[-0.025em] text-[#111111] transition-colors group-hover:text-[#2563EB]">
          {article.displayTitle ?? article.title}
        </h3>
      </div>
    </Link>
  );
}
