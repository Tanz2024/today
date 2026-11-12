import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { Clock, EyesIcon } from "@phosphor-icons/react/ssr";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

export default function WtfSection({ articles }: { articles: Article[] }) {
  const [feature] = articles;
  if (!feature) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-[26px] font-bold sm:text-[36px]">WTF Does That Mean? <EyesIcon weight="fill" className="inline size-[0.8em] align-[-0.08em]" /></h2>
          <p className="mt-1 text-sm text-muted">
            Internet slang, emojis and trends explained without making it weird.
          </p>
        </div>
        <Link
          href={`/${feature.category}`}
          className="hidden shrink-0 text-sm font-semibold text-electric sm:block"
        >
          Explore Culture
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Link
          href={`/${feature.category}/${feature.slug}`}
          className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden border-y border-card-border sm:aspect-[16/10]"
        >
          <Image
            src={feature.image}
            alt={feature.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition duration-200 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/[.94] via-black/35 to-transparent" />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-near-black">
            EXPLAINED
          </span>
          <div className="relative z-10 flex flex-col gap-1.5 p-5">
            <h3 className="font-heading text-xl font-bold leading-tight text-white sm:text-2xl">
              {feature.title}
            </h3>
            <p className="line-clamp-2 max-w-md text-sm text-white/[.92]">{feature.description}</p>
            <span className="flex items-center gap-1 pt-1 text-xs text-white/[.9]">
              <Clock size={13} />
              {formatArticleRecency(feature.date)}
            </span>
          </div>
        </Link>

        <ol className="flex flex-col divide-y divide-card-border border-y border-card-border bg-card">
          {articles.slice(0, 4).map((article, i) => (
            <li key={article.slug}>
              <Link
                href={`/${article.category}/${article.slug}`}
                className="group flex items-center gap-4 p-4 transition hover:bg-off-white dark:hover:bg-white/5"
              >
                <span className="font-heading text-2xl font-bold text-card-border dark:text-white/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <h4 className="font-heading text-sm font-bold leading-snug text-near-black group-hover:text-electric dark:text-white sm:text-base">
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
        </ol>
      </div>

      <Link href={`/${feature.category}`} className="mt-4 block text-center text-sm font-semibold text-electric sm:hidden">
        Explore Culture
      </Link>
    </section>
  );
}
