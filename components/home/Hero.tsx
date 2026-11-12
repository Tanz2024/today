import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { Clock, ArrowRight } from "@phosphor-icons/react/ssr";
import { getCategoryMeta } from "@/lib/categories";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

export default function Hero({ primary, secondary }: { primary: Article; secondary: Article[] }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <Link
        href={`/${primary.category}/${primary.slug}`}
        className="group block"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9]">
          <Image
            src={primary.image}
            alt={primary.imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 65vw"
            className="object-cover transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
          />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-electric">Trending</p>
          <h1 className="font-display text-[30px] font-semibold leading-[1.08] text-near-black sm:text-[44px] lg:text-[48px]">
            {primary.title}
          </h1>
          <p className="max-w-xl text-base text-muted">{primary.description}</p>
          <div className="mt-1 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatArticleRecency(primary.date)}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-near-black transition group-hover:gap-2 group-hover:text-electric">
              Read now <ArrowRight size={13} weight="bold" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-col">
        {secondary.map((article, index) => {
          const cardMeta = getCategoryMeta(article.category);
          return (
            <Link
              key={article.slug}
              href={`/${article.category}/${article.slug}`}
              className="group flex gap-4 border-t border-card-border py-5 first:pt-0 last:border-b"
            >
              <span className="pt-0.5 font-heading text-sm text-muted">0{index + 1}</span>
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-lg font-medium leading-snug text-near-black transition group-hover:text-electric">
                  {article.displayTitle ?? article.title}
                </h2>
                <span className="text-xs text-muted">
                  {cardMeta?.name ?? article.category} · {formatArticleRecency(article.date)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
