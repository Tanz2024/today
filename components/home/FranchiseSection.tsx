import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { Clock } from "@phosphor-icons/react/ssr";
import { getCategoryMeta } from "@/lib/categories";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

interface FranchiseSectionProps {
  title: string;
  subhead: string;
  viewAllHref: string;
  articles: Article[];
  variant: "grid" | "scroll" | "feature-list";
}

function MetaPill({ article }: { article: Article }) {
  const meta = getCategoryMeta(article.category);
  if (!meta) return null;
  return (
    <span
      className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: meta.accent, color: "#111111" }}
    >
      {meta.name}
    </span>
  );
}

export default function FranchiseSection({ title, subhead, viewAllHref, articles, variant }: FranchiseSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-[26px] font-bold sm:text-[36px]">{title}</h2>
          <p className="mt-1 text-sm text-muted">{subhead}</p>
        </div>
        <Link href={viewAllHref} className="shrink-0 text-sm font-semibold text-electric">
          Explore {title}
        </Link>
      </div>

      {variant === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {articles.slice(0, 4).map((article) => (
            <Link
              key={article.slug}
              href={`/${article.category}/${article.slug}`}
              className="group relative flex aspect-square flex-col justify-end overflow-hidden border-y border-card-border"
            >
              <Image
                src={article.image}
                alt={article.imageAlt}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition duration-200 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/[.92] via-black/30 to-transparent" />
              <MetaPill article={article} />
              <h3 className="relative z-10 p-3 font-heading text-sm font-bold leading-snug text-white">
                {article.displayTitle ?? article.title}
              </h3>
            </Link>
          ))}
        </div>
      )}

      {variant === "scroll" && (
        <div className="-mx-4 flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2 sm:mx-0 sm:px-0">
          {articles.slice(0, 6).map((article) => (
            <Link
              key={article.slug}
              href={`/${article.category}/${article.slug}`}
              className="group w-56 shrink-0 overflow-hidden border-y border-card-border bg-card"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.imageAlt}
                  fill
                  sizes="224px"
                  className="object-cover transition duration-200 group-hover:scale-[1.03]"
                />
                <MetaPill article={article} />
              </div>
              <div className="flex flex-col gap-1 p-3">
                <h3 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-near-black group-hover:text-electric dark:text-white">
                  {article.displayTitle ?? article.title}
                </h3>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Clock size={12} />
                  {formatArticleRecency(article.date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {variant === "feature-list" && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          {articles[0] && (
            <Link
              href={`/${articles[0].category}/${articles[0].slug}`}
              className="group relative flex aspect-[16/10] flex-col justify-end overflow-hidden border-y border-card-border"
            >
              <Image
                src={articles[0].image}
                alt={articles[0].imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition duration-200 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/[.94] via-black/35 to-transparent" />
              <MetaPill article={articles[0]} />
              <div className="relative z-10 flex flex-col gap-1.5 p-5">
                <h3 className="font-heading text-xl font-bold leading-tight text-white">{articles[0].title}</h3>
                <span className="flex items-center gap-1 text-xs text-white/[.9]">
                  <Clock size={13} />
                  {formatArticleRecency(articles[0].date)}
                </span>
              </div>
            </Link>
          )}
          <ul className="flex flex-col divide-y divide-card-border border-y border-card-border bg-card">
            {articles.slice(1, 5).map((article) => (
              <li key={article.slug}>
                <Link
                  href={`/${article.category}/${article.slug}`}
                  className="flex items-center gap-3 p-4 transition hover:bg-off-white dark:hover:bg-white/5"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                    <Image src={article.image} alt={article.imageAlt} fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="line-clamp-2 font-heading text-sm font-bold leading-snug text-near-black dark:text-white">
                      {article.displayTitle ?? article.title}
                    </h4>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={12} />
                      {formatArticleRecency(article.date)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
