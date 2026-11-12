import Container from "@/components/ui/Container";
import ArticleCard from "@/components/cards/ArticleCard";
import { compareTrending } from "@/lib/articles";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { getCachedHomepageEngagement } from "@/lib/homepage-engagement";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Trending",
  description: "The TodayAI stories readers are reacting to most right now.",
  path: "/trending",
});

export default async function TrendingPage() {
  const all = await getDiscoverableArticles();
  // Same batched, cached reaction totals as the homepage (one list request
  // per 100 slugs) instead of one read per article.
  const engagement = await getCachedHomepageEngagement(all.map((a) => a.slug));
  if (engagement.status === "unavailable") {
    return <Container className="flex flex-col gap-12 py-8 sm:py-12"><div><h1 className="font-heading text-3xl font-bold sm:text-4xl">Trending</h1><p className="mt-2 max-w-2xl text-muted">Trending data is temporarily unavailable.</p></div></Container>;
  }
  const totals = new Map(all.map((a) => [a.slug, engagement.data.get(a.slug)?.reactions ?? 0]));

  const ranked = [...all].sort((a, b) => compareTrending(a, b, totals));

  const today = ranked.slice(0, 3);
  const thisWeek = ranked.slice(3, 9);
  const popular = ranked.slice(9, 15).length > 0 ? ranked.slice(9, 15) : ranked.slice(0, 6);

  return (
    <Container className="flex flex-col gap-12 py-8 sm:py-12">
      <div>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Trending</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Fresh stories getting our attention this week, with reader reactions shaping what rises over time.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">Trending Today</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {today.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>


      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">Trending This Week</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {thisWeek.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl font-bold">Popular Stories</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    </Container>
  );
}
