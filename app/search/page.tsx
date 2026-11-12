import { Suspense } from "react";

import Container from "@/components/ui/Container";
import SearchClient from "@/components/search/SearchClient";

import { getDiscoverableArticles } from "@/lib/article-catalog";
import { countTopics, toSearchEntry } from "@/lib/article-discovery";
import { buildMetadata } from "@/lib/seo";

// Results depend on the query: crawlable, never indexed, no canonical.
export const metadata = buildMetadata({
  title: "Search",
  description:
    "Search TodayAI: AI news, guides, explainers, questions and every story in the archive.",
  path: "/search",
  noindex: true,
});

export default async function SearchPage() {
  // MDX, generated and community stories, deduplicated by URL.
  const articles = await getDiscoverableArticles();
  const index = articles.map(toSearchEntry);

  /*
   * Keep this intentionally small.
   * These are suggestions, not another giant taxonomy.
   */
  const topics = countTopics(articles).slice(0, 10);

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
            Find something worth reading.
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
            AI news, guides and explainers, plus every story, question and
            feature on TodayAI.
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
            />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
