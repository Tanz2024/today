import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";

import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import ExploreMore from "@/components/category/ExploreMore";

import {
  getArticlesByCategories,
  getFeaturedArticle,
} from "@/lib/articles";

import { getCategoryMeta, getListingCategories } from "@/lib/categories";
import { categoryLandingStyle } from "@/lib/category-colors";
import { getCategoryEditorial } from "@/lib/category-editorial";

import type {
  Article,
  Category,
} from "@/types/article";
import { getPublishedGeneratedArticles } from "@/lib/generated-articles";
import { getTopicIndex } from "@/lib/topic-catalog";
import { getEligibleTopics, topicPath } from "@/lib/topics";
import { formatArticleRecency } from "@/lib/article-recency";
import { getSiteUrl } from "@/lib/seo";

/* =========================================================
   HELPERS
========================================================= */

function articleHref(
  article: Pick<
    Article,
    "category" | "slug"
  >,
) {
  return `/${article.category}/${article.slug}`;
}

function matchesFilter(
  article: Article,
  filter?: string,
) {
  if (!filter || filter === "All") {
    return true;
  }

  return article.tags.some(
    (tag) =>
      tag.toLowerCase() ===
      filter.toLowerCase(),
  );
}

/* =========================================================
   CATEGORY PAGE
========================================================= */

export default async function CategoryPage({
  category,
  activeFilter,
  page: requestedPage,
}: {
  category: Category;
  activeFilter?: string;
  page?: string;
}) {
  const meta =
    getCategoryMeta(category)!;
  const editorial = getCategoryEditorial(category, meta.description);

  const articles = [...getArticlesByCategories(getListingCategories(category) as Category[]), ...(await getPublishedGeneratedArticles()).filter((article) => article.category === category)]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  // Filters are editorial affordances, not empty taxonomy destinations. Only
  // expose a tab when a published story actually carries that canonical tag.
  const availableFilters = meta.filters.filter((filter) =>
    articles.some((article) => article.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase())),
  );

  const defaultFeatured =
    getFeaturedArticle(category);

  const normalizedFilter =
    activeFilter &&
    activeFilter !== "All"
      ? activeFilter
      : undefined;

  const filteredArticles =
    articles.filter((article) =>
      matchesFilter(
        article,
        normalizedFilter,
      ),
    );

  const pageSize = 9;
  const parsedPage = Number.parseInt(requestedPage ?? "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageArticles = filteredArticles.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFirstPage = safePage === 1;

  /*
   * If a filter is active, use the first matching
   * article as the lead rather than showing a
   * feature that belongs to another subtopic.
   */
  const featured =
    isFirstPage && !normalizedFilter && defaultFeatured &&
    pageArticles.some((article) => article.slug === defaultFeatured.slug)
      ? defaultFeatured
      : pageArticles[0] ?? null;

  const remainingArticles =
    pageArticles.filter(
      (article) =>
        article.slug !==
        featured?.slug,
    );

  // The featured story is the cover story. Everything else belongs to one
  // supporting editorial stream so the page does not read like equal archive
  // blocks competing for attention.
  const latest = remainingArticles.slice(0, 8);

  const otherCategories = [
    { name: "Travel", slug: "travel" },
    { name: "Relationships", slug: "relationships" },
    { name: "Campus", slug: "campus" },
  ].filter((item) => item.slug !== category);

  const totalStories =
    filteredArticles.length;

  // Topic hubs whose stories mostly sit on this desk: crawlable links into
  // the desk's subjects without another visual module.
  const deskTopics = getEligibleTopics(await getTopicIndex()).filter((topic) => topic.desk === category).slice(0, 8);
  const isHaunted =
    category === "travel" &&
    normalizedFilter === "Haunted & Strange";

  const siteUrl = getSiteUrl();
  const categoryUrl = `${siteUrl}/${category}`;
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: meta.name,
    description: meta.description,
    url: categoryUrl,
    isPartOf: { "@type": "WebSite", name: "BrisaStory", url: siteUrl },
    mainEntity: {
      "@type": "ItemList",
        itemListElement: pageArticles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: `${siteUrl}/${article.category}/${article.slug}`,
      })),
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrisaStory", item: siteUrl },
      { "@type": "ListItem", position: 2, name: meta.name, item: categoryUrl },
    ],
  };

  return (
    <div className={`editorial-reveal ${isHaunted ? "bg-[#F3F0ED] text-[#171717]" : "bg-white text-[#111111]"}`}>
      <JsonLd data={collectionLd} />
      <JsonLd data={breadcrumbLd} />
      <Container
        className="
          pb-20
          pt-0
          sm:pb-24
          sm:pt-0
          lg:pb-24
          lg:pt-0
        "
      >
        {/* =====================================================
            SECTION HEADER
        ====================================================== */}

        <header
          className="
            group
            relative
            isolate
            overflow-hidden
            left-1/2
            w-screen
            -translate-x-1/2
            max-w-none
            px-5
            pt-12
            pb-10
            sm:px-8
            sm:pt-[5.5rem]
            sm:pb-14
            lg:px-12
            lg:pt-[6.5rem]
            lg:pb-[4.5rem]
            lg:min-h-[350px]
            xl:min-h-[370px]
          "
          style={{ ...categoryLandingStyle(category), backgroundColor: "transparent", borderTop: "0" }}
        >
          {editorial.headerImage && (
            <Image
              src={editorial.headerImage}
              alt=""
              fill
              priority
              sizes="100vw"
              aria-hidden="true"
              className="category-hero-image absolute inset-0 -z-20 object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
              style={{ "--category-mobile-position": editorial.mobileObjectPosition, "--category-desktop-position": editorial.desktopObjectPosition } as React.CSSProperties}
            />
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/[0.64] via-black/[0.36] to-black/[0.10] sm:from-black/[0.58] sm:via-black/[0.32] sm:to-black/[0.06]" />
          <div className="relative z-10 max-w-[94%] sm:max-w-[48%]">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.17em]
                text-white/[.92]
              "
            >
              {editorial.family}
            </p>

            <h1
              className="
                mt-3
                max-w-[22ch]
                text-balance
                font-display
                text-[32px]
                font-semibold
                leading-[1]
                tracking-[-0.05em]
                text-white
                sm:text-[44px]
                lg:text-[52px]
              "
            >
              {isHaunted ? "Haunted & Strange" : meta.name}
            </h1>

            <p
              className="
                mt-4
                max-w-[38ch]
                text-pretty
                text-[15px]
                leading-[1.5]
                text-white/90
                sm:text-[16px]
              "
            >
              {isHaunted ? "Stories from places that feel a little different after dark." : editorial.description}
            </p>
          </div>
        </header>

        {/* =====================================================
            SUBTOPIC NAVIGATION
        ====================================================== */}

        {availableFilters.length > 0 && (
          <div className="relative">
            <nav
              aria-label={`${meta.name} topics`}
              className={`
              relative
              flex
              gap-x-5
              overflow-x-auto
              border-y
              border-black/[0.09]
              px-1
              py-0
              pr-10
              scroll-px-5
              snap-x
              snap-proximity
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
              sm:flex-wrap
              sm:overflow-visible
              sm:pr-0
              ${isHaunted ? "border-black/[0.14]" : ""}
            `}
            >
              <FilterLink
                label="Latest"
                href={`/${category}`}
                active={
                  !normalizedFilter
                }
                themed={false}
              />

            {availableFilters.map(
              (filter) => (
                <FilterLink
                  key={filter}
                  label={filter}
                  href={`/${category}?filter=${encodeURIComponent(
                    filter,
                  )}`}
                  active={
                    normalizedFilter ===
                    filter
                  }
                  themed={isHaunted && filter === "Haunted & Strange"}
                />
              ),
            )}
            </nav>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-px right-0 w-10 bg-gradient-to-r from-transparent to-white sm:hidden"
            />
          </div>
        )}

        {/* =====================================================
            PRIMARY FEATURE
        ====================================================== */}

        {featured && (
          <section
            aria-labelledby="featured-story-heading"
            className="
              mt-10
              sm:mt-12
              lg:mt-14
            "
          >
            <Link
              href={articleHref(
                featured,
              )}
              className="
                group
                block
              "
            >
                <div className="grid gap-6 border-b border-black/[0.09] pb-8 lg:grid-cols-[1.55fr_.85fr] lg:items-end lg:gap-12 lg:pb-10">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--editorial-surface-radius)] bg-[#f1f2f4] sm:aspect-[16/9]">
                <Image
                  src={featured.image}
                  alt={
                    featured.imageAlt
                  }
                  fill
                  priority
                  sizes="
                    (max-width: 768px) 100vw,
                    1200px
                  "
                  className="
                    object-cover
                    transition-transform
                    duration-500
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    group-hover:scale-[1.012]
                  "
                />
                {isHaunted && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#17152b]/[0.10] mix-blend-multiply" />}
                </div>
                <div className="flex flex-col">
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      text-[#747780]
                    "
                  >
                    Editor&apos;s pick
                    <span
                      aria-hidden="true"
                      className="mx-2 text-black/20"
                    >
                      ·
                    </span>
                    {
                      formatArticleRecency(featured.date)
                    }
                  </p>

                  <h2
                    id="featured-story-heading"
                    className="
                      mt-3
                      max-w-[780px]
                      font-display
                      text-[30px]
                      font-semibold
                      leading-[1.08]
                      tracking-[-0.04em]
                      text-[#111111]
                      transition-colors
                      duration-150
                      group-hover:text-[#2563EB]
                      sm:text-[40px]
                      lg:text-[50px]
                    "
                  >
                    {featured.title}
                  </h2>
                <div
                  className="
                    flex
                    flex-col
                    justify-end
                    lg:pb-1
                  "
                >
                  <p
                    className="
                      max-w-[480px]
                      text-[15px]
                      leading-[1.62]
                      text-[#686b73]
                      sm:text-[16px]
                    "
                  >
                    {
                      featured.description
                    }
                  </p>

                  <span
                    className="
                      mt-5
                      inline-flex
                      items-center
                      gap-2
                      text-[14px]
                      font-medium
                      text-[#111111]
                    "
                  >
                    Read story

                    <span
                      aria-hidden="true"
                      className="
                        transition-transform
                        duration-200
                        ease-[cubic-bezier(0.22,1,0.36,1)]
                        group-hover:translate-x-1
                      "
                    >
                      →
                    </span>
                  </span>
                  <p className="mt-4 text-[10px] text-[#85888f]">BrisaStory editorial image · {featured.imageSourceType === "pexels" ? "Pexels" : "BrisaStory archive"}</p>
                </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* =====================================================
            LATEST STORIES / SUPPORTING JOURNALISM
        ====================================================== */}

        {latest.length > 0 && (
          <section
            aria-labelledby="latest-heading"
            className="
              mt-16
              border-t
              border-black/[0.09]
              pt-7
              sm:mt-20
              sm:pt-9
            "
          >
            <div
              className="
                flex
                items-end
                justify-between
                gap-5
                border-b
                border-black/[0.09]
                pb-5
              "
            >
              <div>
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.13em]
                    text-[#777a82]
                  "
                >
                    {normalizedFilter ? normalizedFilter : "Latest"}
                </p>

                <h2
                  id="latest-heading"
                  className="
                    mt-2
                    font-heading
                    text-[29px]
                    font-semibold
                    tracking-[-0.035em]
                    text-[#111111]
                    sm:text-[36px]
                  "
                >
                  {normalizedFilter ? `More ${normalizedFilter}` : `Latest from ${meta.name}`}
                </h2>
              </div>

              <span
                className="
                  hidden
                  text-[12px]
                  text-[#8a8d94]
                  sm:block
                "
              >
                {totalStories}{" "}
                {totalStories === 1
                  ? "story"
                  : "stories"}
              </span>
            </div>

            <div className="mt-7 grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
              {latest[0] && <EditorLead article={latest[0]} />}
              {latest.length > 1 && (
                <div>
                  {latest.slice(1).map((article, index) => (
                    <EditorRow key={article.slug} article={article} number={index + 2} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Story pages"
            className="
              mt-14
              flex
              items-center
              justify-between
              border-t
              border-black/[0.09]
              pt-5
              sm:mt-20
              sm:pt-6
            "
          >
            <PaginationLink
              category={category}
              filter={normalizedFilter}
              page={safePage - 1}
              disabled={safePage === 1}
              label="Previous"
            />

            <div className="hidden items-center gap-1 sm:flex" aria-label="Page number">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <PaginationLink
                  key={pageNumber}
                  category={category}
                  filter={normalizedFilter}
                  page={pageNumber}
                  current={pageNumber === safePage}
                  label={String(pageNumber).padStart(2, "0")}
                />
              ))}
            </div>

            <details className="sm:hidden">
              <summary className="cursor-pointer list-none text-sm font-semibold text-near-black underline decoration-black/25 underline-offset-4">
                Show more pages
              </summary>
              <div className="mt-4 grid grid-cols-4 gap-x-5 gap-y-4" aria-label="Page number">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <PaginationLink
                    key={pageNumber}
                    category={category}
                    filter={normalizedFilter}
                    page={pageNumber}
                    current={pageNumber === safePage}
                    label={String(pageNumber).padStart(2, "0")}
                  />
                ))}
              </div>
            </details>

            <PaginationLink
              category={category}
              filter={normalizedFilter}
              page={safePage + 1}
              disabled={safePage === totalPages}
              label="Next →"
            />
          </nav>
        )}

        {/* =====================================================
            EMPTY FILTER STATE
        ====================================================== */}

        {!featured &&
          filteredArticles.length ===
            0 && (
            <section
              className="
                max-w-[650px]
                py-16
                sm:py-24
              "
            >
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.13em]
                  text-[#777a82]
                "
              >
                Nothing here yet
              </p>

              <h2
                className="
                  mt-3
                  font-heading
                  text-[30px]
                  font-semibold
                  leading-[1.12]
                  tracking-[-0.035em]
                  text-[#111111]
                  sm:text-[40px]
                "
              >
                More{" "}
                {(
                  normalizedFilter ??
                  meta.name
                ).toLowerCase()}{" "}
                stories are on the
                way.
              </h2>

              <Link
                href={`/${category}`}
                className="
                  mt-6
                  inline-flex
                  min-h-[44px]
                  items-center
                  text-[14px]
                  font-medium
                  text-[#2563EB]
                "
              >
                Explore all{" "}
                {meta.name} →
              </Link>
            </section>
          )}

        {/* =====================================================
            ADVERTISEMENT
        ====================================================== */}

        {totalStories >= 6 && <AdSlot slot="category-boundary" className="my-16 sm:my-20 lg:my-24" />}

        {/* =====================================================
            EXPLORE NEXT
        ====================================================== */}

        {deskTopics.length > 0 && (
          <nav aria-labelledby="desk-topics-heading" className="mt-12 border-t border-black/[0.09] pt-6 sm:mt-16">
            <p id="desk-topics-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#777a82]">
              Topics on this desk
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {deskTopics.map((topic) => (
                <li key={topic.slug}>
                  <Link href={topicPath(topic)} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[#2563EB] hover:underline">
                    {topic.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <ExploreMore items={otherCategories} />
      </Container>
    </div>
  );
}

/* =========================================================
   FILTER
========================================================= */

function FilterLink({
  label,
  href,
  active,
  themed,
}: {
  label: string;
  href: string;
  active: boolean;
  themed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={
        active ? "page" : undefined
      }
              className={`
        relative
        flex
        min-h-[44px]
        shrink-0
        snap-start
        items-center
        whitespace-nowrap
        text-[14px]
        font-medium
        transition-colors
        duration-150

        after:absolute
        after:inset-x-0
        after:bottom-0
        after:h-px
        after:origin-left
        ${themed ? "after:bg-[#2F2942]" : "after:bg-[#111111]"}
        after:transition-transform
        after:duration-200
        after:ease-[cubic-bezier(0.22,1,0.36,1)]

        ${
          active
            ? `
              ${themed ? "text-[#2F2942]" : "text-[#111111]"}
              after:scale-x-100
            `
            : `
              text-[#777a82]
              after:scale-x-0
              ${themed ? "hover:text-[#2F2942]" : "hover:text-[#111111]"}
            `
        }
      `}
    >
      {label}
    </Link>
  );
}

/* =========================================================
   EDITOR'S PICK — PRIMARY
========================================================= */

function EditorLead({
  article,
}: {
  article: Article;
}) {
  return (
    <Link
      href={articleHref(article)}
      className="group block"
    >
      <div
        className="
          relative
          aspect-[16/10]
          overflow-hidden
          rounded-[var(--editorial-surface-radius)]
          bg-[#f1f2f4]
        "
      >
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="
            (max-width: 1024px) 100vw,
            650px
          "
          className="
            object-cover
            transition-transform
            duration-400
            ease-[cubic-bezier(0.22,1,0.36,1)]
            group-hover:scale-[1.012]
          "
        />
      </div>

      <p
        className="
          mt-5
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.11em]
          text-[#777a82]
        "
      >
        01
        <span
          aria-hidden="true"
          className="mx-2 text-black/20"
        >
          ·
        </span>
        {formatArticleRecency(article.date)}
        <span aria-hidden="true" className="mx-2 text-black/20">·</span>
        {article.readingTime ?? "5 min read"}
      </p>

      <h3
        className="
          mt-2
          max-w-[650px]
          font-display
          text-[26px]
          font-semibold
          leading-[1.12]
          tracking-[-0.03em]
          text-[#111111]
          transition-colors
          duration-150
          group-hover:text-[#2563EB]
          sm:text-[33px]
        "
      >
        {article.title}
      </h3>

      <p
        className="
          mt-3
          max-w-[620px]
          text-[15px]
          leading-[1.58]
          text-[#6c6f77]
        "
      >
        {article.description}
      </p>
    </Link>
  );
}

/* =========================================================
   EDITOR'S PICK — SECONDARY
========================================================= */

function EditorRow({
  article,
  number,
}: {
  article: Article;
  number: number;
}) {
  return (
    <Link
      href={articleHref(article)}
      className="
        group
        grid
        grid-cols-[1fr_112px]
        gap-5
        border-t
        border-black/[0.09]
        py-6
        first:border-t-0
        first:pt-0
        sm:grid-cols-[1fr_150px]
      "
    >
      <div
        className="
          flex
          min-w-0
          flex-col
          justify-center
        "
      >
        <p
          className="
            editorial-label
            text-[#8a8d94]
          "
        >
          {String(number).padStart(
            2,
            "0",
          )}
          <span
            aria-hidden="true"
            className="mx-2 text-black/20"
          >
            ·
          </span>
          {formatArticleRecency(article.date)}
          <span aria-hidden="true" className="mx-2 text-black/20">·</span>
          {article.readingTime ?? "5 min read"}
        </p>

        <h3
          className="
            mt-2
            font-heading
            text-[19px]
            font-medium
            leading-[1.2]
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
      </div>

      <div
        className="
          relative
          aspect-[4/3]
          self-center
          overflow-hidden
          rounded-[var(--editorial-surface-radius)]
          bg-[#f1f2f4]
        "
      >
        <Image
          src={article.image}
          alt={article.imageAlt}
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
  );
}

/* =========================================================
   LATEST STORY ROW
========================================================= */

// Kept as a reusable editorial variant for future category layouts.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LatestRow({
  article,
  number,
}: {
  article: Article;
  number: number;
}) {
  return (
    <Link
      href={articleHref(article)}
      className="
        group
        grid
        grid-cols-[36px_1fr_96px]
        gap-3
        border-b
        border-black/[0.09]
        py-5
        transition-colors
        duration-150
        hover:bg-[#fafafa]
        focus-visible:bg-[#fafafa]

        sm:grid-cols-[54px_1fr_160px]
        sm:gap-6
        sm:py-7

        lg:grid-cols-[70px_1fr_210px]
      "
    >
      <span
        className="
          pt-1
          font-mono
          text-[11px]
          text-[#9a9ca2]
          sm:text-[12px]
        "
      >
        {String(number).padStart(
          2,
          "0",
        )}
      </span>

      <div
        className="
          flex
          min-w-0
          flex-col
          justify-center
        "
      >
        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.1em]
            text-[#7e8188]
            sm:text-[11px]
          "
        >
          {formatArticleRecency(article.date)}
        </p>

        <h3
          className="
            mt-2
            max-w-[720px]
            font-heading
            text-[18px]
            font-medium
            leading-[1.2]
            tracking-[-0.025em]
            text-[#111111]
            transition-colors
            duration-150
            group-hover:text-[#2563EB]

            sm:text-[23px]
            lg:text-[27px]
          "
        >
          {article.title}
        </h3>

        <p
          className="
            mt-3
            hidden
            max-w-[660px]
            text-[14px]
            leading-[1.5]
            text-[#6d7078]
            md:block
          "
        >
          {article.description}
        </p>
      </div>

      <div
        className="
          relative
          aspect-[4/3]
          self-center
          overflow-hidden
          bg-[#f1f2f4]
        "
      >
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="
            (max-width: 640px) 96px,
            (max-width: 1024px) 160px,
            210px
          "
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
  );
}

function PaginationLink({
  category,
  filter,
  page,
  label,
  current = false,
  disabled = false,
}: {
  category: Category;
  filter?: string;
  page: number;
  label: string;
  current?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span className="inline-flex min-h-11 items-center rounded-[var(--control-radius)] px-3 text-[12px] text-[#b7b8bc]">{label}</span>;
  }

  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return (
    <Link
      href={`/${category}${query ? `?${query}` : ""}`}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--control-radius)] px-3 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric ${
        current
          ? "border border-black/[0.12] bg-white font-semibold text-[#111111]"
          : "text-[#777a82] hover:text-[#111111]"
      }`}
    >
      {label}
    </Link>
  );
}
