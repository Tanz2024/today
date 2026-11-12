import Image from "@/components/ui/MediaImage";
import Link from "next/link";

import { getCategoryMeta } from "@/lib/categories";
import type { Article } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";

function articleHref(
  article: Article,
  sourceModule: "related" | "mid_article" = "related",
) {
  return `/${article.category}/${article.slug}?sourceModule=${sourceModule}`;
}

function categoryName(
  article: Article,
) {
  return (
    getCategoryMeta(article.category)
      ?.name ?? article.category
  );
}

export default function RelatedArticles({
  articles,
  variant = "grid",
  category,
}: {
  articles: Article[];
  variant?: "grid" | "mini";
  category?: string;
}) {
  if (articles.length === 0) {
    return null;
  }

  if (variant === "mini") {
    return (
      <section className="border-t border-card-border pt-6">
        <h2
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.13em]
            text-muted
          "
        >
          More to read
        </h2>

        <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] md:block md:overflow-visible md:pb-0">
          {articles.map(
            (article) => (
              <Link
                key={article.slug}
                href={articleHref(article, "mid_article")}
                className="
                  group
                  flex items-center
                  gap-4
                  min-w-[290px]
                  snap-start
                  border-t
                  border-card-border
                  py-4
                  first:border-t-0
                  first:pt-0
                  md:min-w-0
                "
              >
                <div
                  className="
                    relative
                    h-16 w-20
                    shrink-0
                    overflow-hidden
                    rounded-[4px]
                    bg-[#f1f2f4]
                  "
                >
                  <Image
                    src={article.image}
                    alt={
                      article.imageAlt
                    }
                    fill
                    sizes="80px"
                    className="
                      object-cover
                      transition-transform
                      duration-300
                      ease-[cubic-bezier(0.22,1,0.36,1)]
                      group-hover:scale-[1.015]
                    "
                  />
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.1em]
                      text-muted
                    "
                  >
                    {categoryName(
                      article,
                    )}
                  </p>

                  <h3
                    className="
                      mt-1
                      line-clamp-2
                      font-heading
                      text-[15px]
                      font-medium
                      leading-[1.3]
                      text-near-black
                      transition-colors
                      duration-150
                      group-hover:text-electric
                    "
                  >
                    {article.title}
                  </h3>
                </div>
              </Link>
            ),
          )}
        </div>
      </section>
    );
  }

  const [lead, ...rest] = articles;

  return (
    <section
      aria-labelledby="related-reading-heading"
      className="border-t border-card-border pt-9"
    >
      <div className="flex items-end justify-between gap-5">
        <h2
          id="related-reading-heading"
          className="
            font-heading
            text-[30px]
            font-semibold
            tracking-[-0.035em]
            text-near-black
            sm:text-[36px]
          "
        >
          More to read
        </h2>

        {category && (
          <Link
            href={`/${category}`}
            className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-semibold text-electric transition-opacity hover:opacity-70"
          >
            Back to {getCategoryMeta(category)?.name ?? category}
          </Link>
        )}
      </div>

      <div
        className={`
          mt-7 grid gap-10
          ${
            rest.length > 0
              ? "lg:grid-cols-[1.35fr_.8fr]"
              : ""
          }
        `}
      >
        {/* Lead related story */}
        <Link
          href={articleHref(lead)}
          className="group block"
        >
          <div
            className="
              relative
              aspect-[16/10]
              overflow-hidden
              bg-[#f1f2f4]
            "
          >
            <Image
              src={lead.image}
              alt={lead.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 700px"
              className="
                object-cover
                transition-opacity
                duration-200
                group-hover:opacity-90
              "
            />
          </div>

          <p
            className="
              mt-5
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-muted
            "
          >
            {categoryName(lead)}
          </p>

          <h3
            className="
              mt-2
              max-w-[650px]
              font-heading
              text-[26px]
              font-semibold
              leading-[1.12]
              tracking-[-0.025em]
              text-near-black
              transition-colors
              duration-150
              group-hover:text-electric
              sm:text-[32px]
            "
          >
            {lead.title}
          </h3>

          <p
            className="
              mt-3
              max-w-[620px]
              text-[15px]
              leading-[1.55]
              text-muted
            "
          >
            {lead.description}
          </p>

          <p className="mt-4 text-[12px] text-muted">
            {formatArticleRecency(lead.date)}
          </p>
        </Link>

        {/* Smaller related stories */}
        {rest.length > 0 && (
          <div className="lg:border-l lg:border-card-border lg:pl-8">
            {rest.map(
              (
                article,
                index,
              ) => (
                <Link
                  key={article.slug}
                  href={articleHref(article)}
                  className="
                    group
                    grid
                    grid-cols-[1fr_110px]
                    gap-5
                    border-t
                    border-card-border
                    py-6
                    first:border-t-0
                    first:pt-0
                    sm:grid-cols-[1fr_150px]
                  "
                >
                  <div>
                    <span
                      className="
                        font-mono
                        text-[11px]
                        text-muted
                      "
                    >
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <p
                      className="
                        mt-3
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.1em]
                        text-muted
                      "
                    >
                      {categoryName(
                        article,
                      )}
                    </p>

                    <h3
                      className="
                        mt-2
                        font-heading
                        text-[19px]
                        font-medium
                        leading-[1.25]
                        text-near-black
                        transition-colors
                        duration-150
                        group-hover:text-electric
                        sm:text-[21px]
                      "
                    >
                      {article.title}
                    </h3>

                    <p className="mt-3 text-[12px] text-muted">
                      {
                        formatArticleRecency(article.date)
                      }
                    </p>
                  </div>

                  <div
                    className="
                      relative
                      aspect-[4/3]
                      overflow-hidden
                      rounded-[4px]
                      bg-[#f1f2f4]
                    "
                  >
                    <Image
                      src={
                        article.image
                      }
                      alt={
                        article.imageAlt
                      }
                      fill
                      sizes="150px"
                      className="
                        object-cover
                        transition-transform
                        duration-300
                        ease-[cubic-bezier(0.22,1,0.36,1)]
                        group-hover:scale-[1.015]
                      "
                    />
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}
