import { Suspense } from "react";

import Container from "@/components/ui/Container";
import SearchClient from "@/components/search/SearchClient";

import { getDiscoverableArticles } from "@/lib/article-catalog";
import { countTopics, toSearchEntry } from "@/lib/article-discovery";
import { buildMetadata } from "@/lib/seo";
import { selectAiArticles } from "@/lib/ai-content";
import { CATALOG_GAMES, CATALOG_TOOLS } from "@/lib/site-catalog";

// Results depend on the query: crawlable, never indexed, no canonical.
export const metadata = buildMetadata({
  title: "Search",
  description:
    "Search TodayAI: AI news, guides, comparisons, AI tools and AI games.",
  path: "/search",
  noindex: true,
});

export default async function SearchPage() {
  // MDX, generated and community stories, deduplicated by URL.
  const articles = await getDiscoverableArticles();
  // AI articles only: non-AI archive stories are retired.
  const aiArticles = selectAiArticles(articles);
  const index = aiArticles.map((article) => ({ ...toSearchEntry(article), contentKind: article.contentKind }));
  // TodayAI's own tools and games, searched alongside articles.
  const catalog = [
    ...CATALOG_TOOLS.map((tool) => ({ type: "tool" as const, title: tool.title, href: tool.href, description: tool.description, keywords: (tool.keywords ?? []).join(" ") })),
    ...CATALOG_GAMES.map((game) => ({ type: "game" as const, title: game.title, href: game.href, description: game.description, keywords: (game.keywords ?? []).join(" ") })),
  ];

  /*
   * Keep this intentionally small.
   * These are suggestions, not another giant taxonomy.
   */
  const topics = countTopics(aiArticles).slice(0, 10);

  return (
    <div>
      <Container className="pb-16 pt-8 sm:pb-20 sm:pt-12 lg:pt-14">
        <header className="max-w-[760px]">
          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.14em]
              text-muted
            "
          >
            Search
          </p>

          <h1
            className="
              mt-4
              max-w-[720px]
              font-heading
              text-[34px]
              font-semibold
              leading-[1.03]
              tracking-[-0.045em]
              text-ink
              sm:text-[44px]
              lg:text-[50px]
            "
          >
            Search articles, tools and games.
          </h1>

          <p
            className="
              mt-4
              max-w-[600px]
              text-[16px]
              leading-[1.6]
              text-muted
              sm:text-[17px]
            "
          >
            AI news, guides, comparisons, free AI tools and AI games.
          </p>
        </header>

        <div className="mt-8 sm:mt-10">
          <Suspense
            fallback={
              <div
                className="
                  h-[64px]
                  w-full
                  max-w-[980px]
                  border-b
                  border-black/[0.12]
                "
              />
            }
          >
            <SearchClient
              index={index}
              topics={topics}
              catalog={catalog}
            />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
