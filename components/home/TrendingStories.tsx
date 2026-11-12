"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/ssr";

import ArticleCard from "@/components/cards/ArticleCard";
import TrendingCarouselMobile from "@/components/home/TrendingCarouselMobile";
import type { ArticleCardData } from "@/types/article";
import { readRecentArticles } from "@/lib/recently-read";
import { readHomepageInterests, scoreArticleForVisitor } from "@/lib/homepage-personalization";

// `articles` should already be ranked (e.g. by real reaction totals) and
// pre-sliced to the max the homepage wants to show — no fake counts here.
export default function TrendingStories({ articles }: { articles: ArticleCardData[] }) {
  const [personalized, setPersonalized] = useState<ArticleCardData[] | null>(null);

  useEffect(() => {
    const interests = readHomepageInterests(window.localStorage);
    const recentlyRead = readRecentArticles(window.localStorage);
    const score = (article: ArticleCardData) => scoreArticleForVisitor({ ...article, tags: [], updated: article.date }, { interests, recentlyRead });
    const ranked = [...articles].sort((a, b) => score(b) - score(a));
    queueMicrotask(() => setPersonalized(ranked));
  }, [articles]);

  if (articles.length === 0) return null;

  const shown = (personalized ?? articles).slice(0, 3);

  return (
    <section aria-labelledby="fresh-stories-heading" className="pt-1">
      <div className="flex items-end justify-between gap-8">
        <div>
          
          <h2 id="fresh-stories-heading" className="mt-1 font-heading text-[24px] font-semibold leading-[1.08] tracking-[-0.035em] text-near-black sm:text-[29px]">
            Fresh stories
          </h2>
        </div>

        <Link href="/search" className="hidden min-h-11 shrink-0 items-center gap-2 text-[13px] font-semibold text-near-black transition-colors hover:text-electric sm:inline-flex">
          See all stories
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Mobile: swipeable carousel, manual control only. Desktop: three equal cards. */}
      <div className="mt-4">
        <TrendingCarouselMobile articles={shown} />
      </div>

      <div className="mt-4 hidden gap-6 sm:grid sm:grid-cols-3">
        {shown.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      <Link href="/search" className="mt-4 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-near-black sm:hidden">
        See all stories
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
