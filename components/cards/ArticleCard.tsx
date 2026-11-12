import Link from "next/link";
import Image from "@/components/ui/MediaImage";

import { getCategoryMeta } from "@/lib/categories";
import { categoryAccentStyle } from "@/lib/category-colors";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

export default function ArticleCard({
  article,
  priority = false,
}: {
  article: Pick<
    Article,
    | "slug"
    | "category"
    | "title"
    | "description"
    | "image"
    | "imageAlt"
    | "date"
  >;
  priority?: boolean;
}) {
  const meta = getCategoryMeta(article.category);

  return (
    <Link
      href={`/${article.category}/${article.slug}`}
      className="
        group
        flex h-full flex-col
        min-w-0
        border-b border-black/[0.09]
        pb-6
        transition-colors duration-150
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric
      "
    >
      {/* Image */}
      <div
        className="
          relative
          aspect-[16/10]
          w-full
          overflow-hidden
          rounded-[var(--editorial-surface-radius)]
          bg-[#f1f2f4]
        "
      >
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          priority={priority}
          sizes="
            (max-width: 768px) 100vw,
            (max-width: 1200px) 50vw,
            33vw
          "
          className="
            object-cover
            transition-opacity
            duration-200
            ease-[cubic-bezier(0.22,1,0.36,1)]
            group-hover:opacity-90
          "
        />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col pt-4">
        {/* Editorial metadata */}
        <div
          className="
            flex flex-wrap items-center
            gap-x-2 gap-y-1
            editorial-label
          "
        >
          {meta && <span style={categoryAccentStyle(article.category)}>{meta.name}</span>}

          {meta && (
            <span
              aria-hidden="true"
              className="text-black/25"
            >
              ·
            </span>
          )}

          <span>{formatArticleRecency(article.date)}</span>
        </div>

        {/* Title */}
        <h3
          className="
            mt-2.5
            font-heading
            line-clamp-3
            text-[18px]
            font-semibold
            leading-[1.16]
            tracking-[-0.025em]
            text-[#111111]
            transition-colors
            duration-150
            group-hover:text-[#2563EB]
            sm:text-[22px]
          "
        >
          {article.title}
        </h3>

        {/* Description */}
        <p
          className="
            mt-3
            line-clamp-2
            text-[13px]
            leading-[1.55]
            text-[#6b6e76]
            sm:text-[15px]
          "
        >
          {article.description}
        </p>
      </div>
    </Link>
  );
}
