"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "@/components/ui/MediaImage";
import { formatArticleRecency } from "@/lib/article-recency";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowRight,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";

import type {
  SearchIndexEntry,
  TopicEntry,
} from "@/lib/articles";

import { CATEGORIES } from "@/lib/categories";

// Topic suggestions are the AI news topics (legacy desks are retired).
const PUBLIC_CATEGORIES = AI_TOPICS.map((topic) => ({ slug: `news/${topic.slug}`, name: topic.name, description: topic.description }));
import { AI_TOPICS } from "@/lib/ai-taxonomy";
import { categoryAccentStyle } from "@/lib/category-colors";
import { PRIMARY_NAV, NAV_DESCRIPTIONS } from "@/lib/nav";

const EXPLORE_DESTINATIONS = [
  ...PRIMARY_NAV.filter((item) => item.href !== "/").map((item) => ({ label: item.label, href: item.href })),
].map((item) => [item.label, NAV_DESCRIPTIONS[item.href] ?? "", item.href] as const);

type Tab =
  | "all"
  | "stories"
  | "tools"
  | "games"
  | "comparisons"
  | "topics";

export type CatalogEntry = { type: "tool" | "game"; title: string; href: string; description: string; keywords: string };

const TABS: {
  value: Tab;
  label: string;
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "stories",
    label: "Articles",
  },
  {
    value: "tools",
    label: "Tools",
  },
  {
    value: "games",
    label: "Games",
  },
  {
    value: "comparisons",
    label: "Comparisons",
  },
  {
    value: "topics",
    label: "Topics",
  },
];

export default function SearchClient({
  index,
  topics,
  catalog = [],
}: {
  index: SearchIndexEntry[];
  topics: TopicEntry[];
  catalog?: CatalogEntry[];
}) {
  const params = useSearchParams();
  const router = useRouter();

  const inputRef =
    useRef<HTMLInputElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] =
    useState(
      () => params.get("q") ?? "",
    );

  const [tab, setTab] =
    useState<Tab>(() => {
      const requested = params.get("type");
      return requested === "stories" || requested === "topics" || requested === "tools" || requested === "games" || requested === "comparisons" ? requested : "all";
    });

  const BROWSE_PAGE_SIZE = 10;
  const [browsePage, setBrowsePage] = useState(1);
  const [explorePage, setExplorePage] = useState(0);
  const [exploreMaxPage, setExploreMaxPage] = useState(6);

  useEffect(() => {
    const updateExplorePages = () => setExploreMaxPage(window.innerWidth >= 1024 ? 2 : 6);
    updateExplorePages();
    window.addEventListener("resize", updateExplorePages);
    return () => window.removeEventListener("resize", updateExplorePages);
  }, []);
  const browseTotalPages = Math.max(1, Math.ceil(index.length / BROWSE_PAGE_SIZE));

  const normalizedQuery =
    query.trim().toLowerCase();

  // Keep the query in the URL (replace, not push) so results are shareable
  // and browser Back restores the previous query without a new history entry
  // per keystroke.
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (query.trim()) {
      next.set("q", query);
    } else {
      next.delete("q");
    }
    const nextQueryString = next.toString();
    const currentQueryString = params.toString();
    if (nextQueryString !== currentQueryString) {
      router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (tab === "all") next.delete("type");
    else next.set("type", tab);
    const nextQueryString = next.toString();
    if (nextQueryString !== params.toString()) {
      router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Autofocus when the user intentionally opens the dedicated search page.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /*
   * ---------------------------------------------------------
   * STORY RESULTS
   * ---------------------------------------------------------
   */
  const articleResults =
    useMemo(() => {
      if (!normalizedQuery) {
        return index;
      }

      return index.filter(
        (entry) => {
          const category =
            CATEGORIES.find(
              (item) =>
                item.slug ===
                entry.category,
            );

          const haystack = [
            entry.title,
            entry.description,
            entry.category,
            category?.name ?? "",
            ...(entry.tags ?? []),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            normalizedQuery,
          );
        },
      );
    }, [
      normalizedQuery,
      index,
    ]);

  /*
   * ---------------------------------------------------------
   * CATEGORY RESULTS
   * ---------------------------------------------------------
   */
  const categoryResults =
    useMemo(() => {
      if (!normalizedQuery) {
        return PUBLIC_CATEGORIES;
      }

      return PUBLIC_CATEGORIES.filter(
        (category) => {
          const haystack = [
            category.name,
            category.description,
            category.slug,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            normalizedQuery,
          );
        },
      );
    }, [normalizedQuery]);

  /*
   * ---------------------------------------------------------
   * TAG / TOPIC RESULTS
   * ---------------------------------------------------------
   */
  const topicResults =
    useMemo(() => {
      if (!normalizedQuery) {
        return topics;
      }

      return topics.filter(
        (topic) =>
          topic.tag
            .toLowerCase()
            .includes(
              normalizedQuery,
            ),
      );
    }, [
      normalizedQuery,
      topics,
    ]);

  const catalogResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return catalog.filter((entry) => `${entry.title} ${entry.description} ${entry.keywords}`.toLowerCase().includes(normalizedQuery));
  }, [catalog, normalizedQuery]);
  const toolResults = catalogResults.filter((entry) => entry.type === "tool");
  const gameResults = catalogResults.filter((entry) => entry.type === "game");
  const comparisonResults = articleResults.filter((entry) => entry.contentKind === "comparison" || entry.contentKind === "review");
  const showTools = tab === "all" || tab === "tools";
  const showGames = tab === "all" || tab === "games";
  const showComparisons = tab === "comparisons";

  const showStories =
    tab === "all" ||
    tab === "stories";

  const showTopics =
    tab === "all" ||
    tab === "topics";

  const matchingTopicCount =
    categoryResults.length +
    topicResults.length;

  const totalCount =
    (showStories
      ? articleResults.length
      : 0) +
    (showTools ? toolResults.length : 0) +
    (showGames ? gameResults.length : 0) +
    (showComparisons ? comparisonResults.length : 0) +
    (showTopics
      ? matchingTopicCount
      : 0);

  const hasQuery =
    query.trim().length > 0;

  function clearSearch() {
    setQuery("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function chooseTopic(
    topic: string,
  ) {
    setQuery(topic);
    setTab("all");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function handleSearchKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Escape" &&
      query
    ) {
      event.preventDefault();
      clearSearch();
    }
  }

  function moveExplore(direction: 1 | -1) {
    const element = exploreRef.current;
    if (!element) return;
    const firstCard = element.firstElementChild as HTMLElement | null;
    const step = window.innerWidth >= 1024 ? element.clientWidth : firstCard?.offsetWidth ?? element.clientWidth;
    const nextPage = Math.max(0, Math.min(exploreMaxPage, explorePage + direction));
    element.scrollTo({ left: Math.min(nextPage * step, element.scrollWidth - element.clientWidth), behavior: "smooth" });
    setExplorePage(nextPage);
  }

  return (
    <div className="max-w-[1000px]">
      {/* =====================================================
          SEARCH INPUT
      ====================================================== */}

      <div
        className="
          group
          relative
          border-b
          border-black/[0.18]
          transition-colors
          duration-200
          focus-within:border-[#111111]
        "
      >
        <MagnifyingGlass
          size={23}
          weight="regular"
          aria-hidden="true"
          className="
            absolute
            left-0
            top-1/2
            -translate-y-1/2
            text-[#777b83]
          "
        />

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          onKeyDown={
            handleSearchKeyDown
          }
          placeholder="Search TodayAI"
          aria-label="Search TodayAI"
          autoComplete="off"
          className="
            h-[62px]
            w-full
            appearance-none
            bg-transparent
            pl-9
            pr-14
            font-heading
            text-[20px]
            font-medium
            tracking-[-0.015em]
            text-[#111111]
            outline-none
            placeholder:font-normal
            placeholder:text-[#979aa1]
            sm:h-[68px]
            sm:text-[23px]
          "
        />

        {hasQuery && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="
              absolute
              right-0
              top-1/2
              flex
              h-11
              min-w-11
              -translate-y-1/2
              items-center
              justify-center
              text-[#777b83]
              transition-colors
              duration-150
              hover:text-[#111111]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-electric
              focus-visible:ring-offset-2
            "
          >
            <X
              size={19}
              weight="regular"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* =====================================================
          SEARCH SCOPE
      ====================================================== */}

      <div
        className="
          mt-6
          flex
          items-center
          gap-7
          border-b
          border-black/[0.08]
          sm:gap-9
        "
        role="tablist"
        aria-label="Search filters"
      >
        {TABS.map((item) => {
          const active =
            tab === item.value;

          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={
                active
              }
              onClick={() =>
                setTab(item.value)
              }
              className={`
                relative
                min-h-[44px]
                pb-3
                text-[14px]
                font-medium
                transition-colors
                duration-150
                focus-visible:outline-none
                ${
                  active
                    ? "text-[#111111]"
                    : "text-[#777b83] hover:text-[#111111]"
                }
              `}
            >
              {item.label}

              <span
                aria-hidden="true"
                className={`
                  absolute
                  inset-x-0
                  bottom-[-1px]
                  h-[2px]
                  origin-left
                  bg-electric
                  transition-transform
                  duration-200
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  ${
                    active
                      ? "scale-x-100"
                      : "scale-x-0"
                  }
                `}
              />
            </button>
          );
        })}
      </div>

      {/* =====================================================
          INITIAL / DISCOVERY STATE
      ====================================================== */}

      {!hasQuery ? (
        <div className="pt-7 sm:pt-9">
          {showTopics && (
            <section
              aria-labelledby="search-explore-heading"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-electric">Not sure what to search?</p>
                <div className="flex items-end justify-between gap-5">
                  <h2 id="search-explore-heading" className="mt-2 font-heading text-[26px] font-semibold tracking-[-0.035em] text-[#111111] sm:text-[32px]">Explore topics</h2>
                </div>
              </div>

              <div
                ref={exploreRef}
                onScroll={(event) => setExplorePage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
                className="
                  mt-6
                  relative
                  grid
                  search-explore-carousel
                  grid-flow-col
                  gap-0
                  overflow-x-auto
                  pb-2
                  snap-x
                  snap-mandatory
                  [scrollbar-width:none]
                  [&::-webkit-scrollbar]:hidden
                  lg:border-y
                  lg:border-black/[0.10]
                "
              >
                {EXPLORE_DESTINATIONS.map(
                  (
                    [label, description, href],
                    index,
                  ) => (
                    <Link
                      key={href}
                      href={href}
                      className={`
                        group
                        min-w-0
                        flex
                        min-h-[260px]
                        snap-start
                        items-start
                        justify-between
                        gap-5
                        border-b
                        border-black/[0.10]
                        px-5
                        py-7
                        text-[#111111]
                        transition-colors duration-200
                        hover:bg-black/[0.025]
                        lg:min-h-[220px]
                        lg:border-b-0
                        lg:border-l
                        lg:px-7
                        lg:py-8
                        lg:last:border-r
                      `}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-mono text-[12px] tracking-[0.08em] text-electric">{String(index + 1).padStart(2, "0")}</span>
                        <span className="mt-7 min-w-0"><span className="block break-words font-heading text-[27px] font-semibold leading-[1.04] tracking-[-0.035em] transition-transform duration-200 group-hover:translate-x-1 sm:text-[30px]">{label}</span><span className="mt-5 block max-w-[270px] break-words font-body text-[14px] leading-[1.55] text-[#737780] sm:text-[15px]">{description}</span></span>
                      </span>

                    </Link>
                  ),
                )}
              </div>
              <div className="mt-5 flex flex-col items-center gap-4 border-t border-black/[0.08] pt-4">
                <div className="flex items-center gap-5">
                  <button type="button" onClick={() => moveExplore(-1)} disabled={explorePage === 0} aria-label="Previous topics" className="text-[18px] text-[#777b83] transition hover:text-[#111111] disabled:opacity-25">←</button>
                  <span className="flex gap-1.5" aria-label={`Topic slide ${explorePage + 1} of ${exploreMaxPage + 1}`}>
                    {Array.from({ length: exploreMaxPage + 1 }, (_, dot) => <span key={dot} className={`h-1.5 rounded-full transition-all ${dot === explorePage ? "w-5 bg-[#111111]" : "w-1.5 bg-[#c7c9cf]"}`} />)}
                  </span>
                  <button type="button" onClick={() => moveExplore(1)} disabled={explorePage >= exploreMaxPage} aria-label="Next topics" className="text-[18px] text-[#777b83] transition hover:text-[#111111] disabled:opacity-25">→</button>
                </div>
                <Link href="/topics" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777b83] transition-colors hover:text-[#111111]">View all categories</Link>
              </div>
            </section>
          )}

          {showStories && (
            <section
              aria-labelledby="search-browse-heading"
              className={
                showTopics
                  ? "mt-14 sm:mt-16"
                  : ""
              }
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
                <h2
                  id="search-browse-heading"
                  className="
                    font-heading
                    text-[26px]
                    font-semibold
                    tracking-[-0.03em]
                    text-[#111111]
                    sm:text-[31px]
                  "
                >
                  Browse stories
                </h2>

                <span
                  className="
                    hidden
                    text-[12px]
                    text-[#85888f]
                    sm:block
                  "
                >
                  {index.length} stories
                </span>
              </div>

              <div>
                {index
                  .slice(
                    (browsePage - 1) * BROWSE_PAGE_SIZE,
                    browsePage * BROWSE_PAGE_SIZE,
                  )
                  .map((entry) => (
                    <StoryResult
                      key={`${entry.category}-${entry.slug}`}
                      entry={entry}
                    />
                  ))}
              </div>

              {browseTotalPages > 1 && (
                <BrowsePagination
                  page={browsePage}
                  totalPages={browseTotalPages}
                  onChange={setBrowsePage}
                />
              )}
            </section>
          )}

        </div>
      ) : (
        /* ===================================================
            ACTIVE SEARCH STATE
        ==================================================== */

        <div className="pt-8 sm:pt-10">
          <div
            className="
              flex
              flex-wrap
              items-end
              justify-between
              gap-4
              border-b
              border-black/[0.09]
              pb-5
            "
          >
            <div>
              <p
                aria-live="polite"
                className="
                  text-[13px]
                  text-[#777b83]
                "
              >
                {totalCount}{" "}
                {totalCount === 1
                  ? "result"
                  : "results"}{" "}
                for
              </p>

              <h2
                className="
                  mt-1
                  font-heading
                  text-[24px]
                  font-semibold
                  tracking-[-0.025em]
                  text-[#111111]
                  sm:text-[30px]
                "
              >
                &ldquo;
                {query.trim()}
                &rdquo;
              </h2>
            </div>

            <button
              type="button"
              onClick={clearSearch}
              className="
                min-h-[44px]
                text-[13px]
                font-medium
                text-[#777b83]
                transition-colors
                duration-150
                hover:text-[#111111]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-electric
                focus-visible:ring-offset-2
              "
            >
              Clear search
            </button>
          </div>

          {totalCount > 0 ? (
            <>
              {/* =============================================
                  TOPIC/CATEGORY MATCHES
              ============================================== */}

              {showTopics &&
                matchingTopicCount >
                  0 && (
                  <section
                    aria-labelledby="matching-topics-heading"
                    className="mt-9"
                  >
                    <h3
                      id="matching-topics-heading"
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.13em]
                        text-[#777b83]
                      "
                    >
                      Matching topics
                    </h3>

                    <div
                      className="
                        mt-4
                        border-t
                        border-black/[0.09]
                      "
                    >
                      {categoryResults.map(
                        (
                          category,
                        ) => (
                          <Link
                            key={
                              category.slug
                            }
                            href={`/${category.slug}`}
                            className="
                              group
                              flex
                              min-h-[62px]
                              items-center
                              justify-between
                              gap-5
                              border-b
                              border-black/[0.09]
                              py-4
                            "
                          >
                            <div>
                              <p
                                className="
                                  text-[16px]
                                  font-medium
                                  text-[#111111]
                                  transition-colors
                                  duration-150
                                  group-hover:text-electric
                                "
                              >
                                {
                                  category.name
                                }
                              </p>

                              <p
                                className="
                                  mt-1
                                  line-clamp-1
                                  text-[13px]
                                  leading-[1.45]
                                  text-[#777b83]
                                "
                              >
                                {
                                  category.description
                                }
                              </p>
                            </div>

                            <ArrowRight
                              size={
                                17
                              }
                              weight="regular"
                              aria-hidden="true"
                              className="
                                shrink-0
                                text-[#999ca3]
                                transition-all
                                duration-200
                                group-hover:translate-x-1
                                group-hover:text-electric
                              "
                            />
                          </Link>
                        ),
                      )}
                    </div>

                    {topicResults.length >
                      0 && (
                      <div
                        className="
                          mt-5
                          flex
                          flex-wrap
                          gap-x-6
                          gap-y-3
                        "
                      >
                        {topicResults.map(
                          (
                            topic,
                          ) => (
                            <button
                              key={
                                topic.tag
                              }
                              type="button"
                              onClick={() =>
                                chooseTopic(
                                  topic.tag,
                                )
                              }
                              className="
                                min-h-[36px]
                                text-[14px]
                                text-[#5d6067]
                                underline
                                decoration-black/[0.16]
                                underline-offset-4
                                transition-colors
                                duration-150
                                hover:text-electric
                                hover:decoration-electric
                              "
                            >
                              {
                                topic.tag
                              }
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                )}

              {showTools && toolResults.length > 0 ? <CatalogResults id="tool-results-heading" title="Tools" entries={toolResults} /> : null}
              {showGames && gameResults.length > 0 ? <CatalogResults id="game-results-heading" title="Games" entries={gameResults} /> : null}
              {showComparisons && comparisonResults.length > 0 ? (
                <section aria-labelledby="comparison-results-heading" className="mt-9">
                  <div className="search-group-head"><h3 id="comparison-results-heading">Comparisons & reviews</h3><span>{comparisonResults.length}</span></div>
                  <div>{comparisonResults.map((entry) => <StoryResult key={`${entry.category}-${entry.slug}`} entry={entry} query={normalizedQuery} />)}</div>
                </section>
              ) : null}

              {/* =============================================
                  STORY RESULTS
              ============================================== */}

              {showStories &&
                articleResults.length >
                  0 && (
                  <section
                    aria-labelledby="story-results-heading"
                    className={
                      showTopics &&
                      matchingTopicCount >
                        0
                        ? "mt-14"
                        : "mt-9"
                    }
                  >
                    <div
                      className="
                        flex
                        items-end
                        justify-between
                        border-b
                        border-black/[0.09]
                        pb-4
                      "
                    >
                      <h3
                        id="story-results-heading"
                        className="
                          font-heading
                          text-[23px]
                          font-semibold
                          tracking-[-0.025em]
                          text-[#111111]
                          sm:text-[27px]
                        "
                      >
                        Stories
                      </h3>

                      <span
                        className="
                          text-[12px]
                          text-[#85888f]
                        "
                      >
                        {
                          articleResults.length
                        }
                      </span>
                    </div>

                    <div>
                      {articleResults.map(
                        (
                          entry,
                        ) => (
                          <StoryResult
                            key={`${entry.category}-${entry.slug}`}
                            entry={
                              entry
                            }
                            query={normalizedQuery}
                          />
                        ),
                      )}
                    </div>
                  </section>
                )}
            </>
          ) : (
            <EmptyState
              query={query}
              topics={topics}
              onTopic={
                chooseTopic
              }
              onClear={
                clearSearch
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TOOL & GAME RESULTS
========================================================= */

function CatalogResults({ id, title, entries }: { id: string; title: string; entries: CatalogEntry[] }) {
  return (
    <section aria-labelledby={id} className="mt-9">
      <div className="search-group-head"><h3 id={id}>{title}</h3><span>{entries.length}</span></div>
      <ul className="search-catalog-list">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link href={entry.href} className="search-catalog-item">
              <span className="search-catalog-type">{entry.type === "tool" ? "Tool" : "Game"}</span>
              <span className="search-catalog-title">{entry.title}</span>
              <span className="search-catalog-text">{entry.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* =========================================================
   BROWSE PAGINATION
========================================================= */

function BrowsePagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  function go(next: number) {
    onChange(next);
    document.getElementById("search-browse-heading")?.scrollIntoView({ block: "start" });
  }

  return (
    <nav
      aria-label="Browse stories pagination"
      className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-black/[0.09] pt-5"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        className="min-h-11 text-[13px] font-semibold text-[#111111] transition-colors duration-150 hover:text-electric disabled:pointer-events-none disabled:text-[#c2c4c8]"
      >
        ← Previous
      </button>

      <div className="flex flex-wrap items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => go(n)}
            aria-current={n === page ? "page" : undefined}
            className={`flex min-h-11 min-w-11 items-center justify-center text-[13px] font-semibold transition-colors duration-150 ${
              n === page ? "text-[#111111] underline underline-offset-4" : "text-[#9a9da3] hover:text-[#111111]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        className="min-h-11 text-[13px] font-semibold text-[#111111] transition-colors duration-150 hover:text-electric disabled:pointer-events-none disabled:text-[#c2c4c8]"
      >
        Next →
      </button>
    </nav>
  );
}

/* =========================================================
   STORY RESULT
========================================================= */

function HighlightMatch({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;

  const lower = text.toLowerCase();
  const index = lower.indexOf(query);
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-[#FFF3C8] text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function StoryResult({
  entry,
  query,
}: {
  entry: SearchIndexEntry;
  query?: string;
}) {
  const category =
    CATEGORIES.find(
      (item) =>
        item.slug ===
        entry.category,
    );

  return (
    <Link
      href={`/${entry.category}/${entry.slug}`}
      className="
        group
        grid
        grid-cols-[92px_1fr]
        gap-4
        border-b
        border-black/[0.09]
        py-5
        sm:grid-cols-[150px_1fr]
        sm:gap-6
        sm:py-6
      "
    >
      <div
        className="
          relative
          aspect-[4/3]
          w-full
          overflow-hidden
          bg-[#f1f2f4]
        "
      >
        <Image
          src={entry.image}
          alt={entry.imageAlt}
          fill
          sizes="
            (max-width: 640px) 92px,
            150px
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

      <div
        className="
          flex
          min-w-0
          flex-col
          justify-center
        "
      >
        <div
          className="
            flex
            flex-wrap
            items-center
            gap-x-2
            gap-y-1
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.1em]
            text-[#7a7d84]
            sm:text-[11px]
          "
        >
          {category && (
            <>
              <span style={categoryAccentStyle(entry.category)}>
                {category.name}
              </span>

              <span
                aria-hidden="true"
                className="text-black/25"
              >
                ·
              </span>
            </>
          )}

          <span>
            {formatArticleRecency(entry.date)}
          </span>
        </div>

        <h3
          className="
            mt-1.5
            line-clamp-2
            font-heading
            text-[17px]
            font-semibold
            leading-[1.2]
            tracking-[-0.02em]
            text-[#111111]
            transition-colors
            duration-150
            group-hover:text-electric
            sm:mt-2
            sm:text-[22px]
          "
        >
          <HighlightMatch text={entry.title} query={query} />
        </h3>

        <p
          className="
            mt-2
            hidden
            max-w-[610px]
            line-clamp-2
            text-[14px]
            leading-[1.5]
            text-[#6f7279]
            sm:block
          "
        >
          {entry.description}
        </p>
      </div>
    </Link>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  query,
  topics,
  onTopic,
  onClear,
}: {
  query: string;
  topics: TopicEntry[];
  onTopic: (
    topic: string,
  ) => void;
  onClear: () => void;
}) {
  return (
    <section
      className="
        max-w-[680px]
        py-14
        sm:py-20
      "
    >
      <p
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.13em]
          text-[#777b83]
        "
      >
        Nothing found
      </p>

      <h2
        className="
          mt-3
          font-heading
          text-[28px]
          font-semibold
          leading-[1.12]
          tracking-[-0.03em]
          text-[#111111]
          sm:text-[36px]
        "
      >
        We couldn&apos;t find
        anything for &ldquo;
        {query.trim()}
        &rdquo;.
      </h2>

      <p
        className="
          mt-4
          max-w-[520px]
          text-[15px]
          leading-[1.6]
          text-[#6f7279]
        "
      >
        Try a shorter phrase, a
        different spelling, or one
        of these topics.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="
          mt-6
          min-h-[44px]
          text-[14px]
          font-medium
          text-electric
          transition-opacity
          hover:opacity-70
        "
      >
        Clear search →
      </button>

      {topics.length > 0 && (
        <div
          className="
            mt-9
            border-t
            border-black/[0.09]
            pt-6
          "
        >
          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.13em]
              text-[#777b83]
            "
          >
            Try instead
          </p>

          <div
            className="
              mt-4
              flex
              flex-wrap
              gap-x-6
              gap-y-3
            "
          >
            {topics
              .slice(0, 6)
              .map(
                (topic) => (
                  <button
                    key={
                      topic.tag
                    }
                    type="button"
                    onClick={() =>
                      onTopic(
                        topic.tag,
                      )
                    }
                    className="
                      min-h-[36px]
                      text-[14px]
                      text-[#4f5157]
                      underline
                      decoration-black/[0.18]
                      underline-offset-4
                      transition-colors
                      hover:text-electric
                      hover:decoration-electric
                    "
                  >
                    {topic.tag}
                  </button>
                ),
              )}
          </div>
        </div>
      )}
    </section>
  );
}
