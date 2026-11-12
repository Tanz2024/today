"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import ArticleCard from "@/components/cards/ArticleCard";
import type { ArticleCardData } from "@/types/article";

const PAGE_SIZE = 4;

// Desktop/tablet only (paired with TrendingCarouselMobile for mobile) —
// shows mood results four at a time instead of a long scrolling grid.
export default function MoodResultsDesktop({ articles }: { articles: ArticleCardData[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const visible = articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="hidden sm:block">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous stories"
            className="flex min-h-11 min-w-11 items-center justify-center text-near-black transition-colors hover:text-electric disabled:pointer-events-none disabled:text-[#c2c4c8]"
          >
            <ArrowLeft size={18} aria-hidden />
          </button>

          <div className="flex items-center gap-1.5" role="tablist" aria-label="Mood results page">
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
              <span
                key={i}
                role="tab"
                aria-selected={i === page}
                aria-label={`Page ${i + 1} of ${totalPages}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === page ? "w-4 bg-near-black" : "w-1.5 bg-black/20"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="More stories"
            className="flex min-h-11 min-w-11 items-center justify-center text-near-black transition-colors hover:text-electric disabled:pointer-events-none disabled:text-[#c2c4c8]"
          >
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
