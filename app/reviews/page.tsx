import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { GuideCard } from "@/components/editorial/Story";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

async function getReviews() {
  // Only articles an editor explicitly declared as `contentType: review` or
  // `comparison` appear here. Reviews are never inferred from titles.
  return selectAiArticles(await getPublicDiscoverableArticles()).filter((article) => article.contentKind === "review" || article.contentKind === "comparison");
}

export async function generateMetadata() {
  const reviews = await getReviews();
  return buildMetadata({
    title: "AI reviews & comparisons",
    description: "Hands-on TodayAI reviews of AI tools and side-by-side comparisons.",
    path: "/reviews",
    // An empty listing is not useful to searchers; index it once reviews exist.
    noindex: reviews.length === 0,
  });
}

export default async function ReviewsPage() {
  const reviews = await getReviews();
  return (
    <Container className="hub">
      <PageHeader eyebrow="Reviews" title="Reviews & comparisons" description="Hands-on reviews of AI tools and side-by-side comparisons, written after we've actually used them." />
      {reviews.length ? (
        <div className="home-guides-grid hub-section">{reviews.map((article) => <GuideCard key={article.slug} article={article} />)}</div>
      ) : (
        <div className="empty-state">
          <h2>No reviews published yet</h2>
          <p>Reviews appear here once an editor has tested a tool and published the review. In the meantime, the AI tools directory lists products by category with links to their official sites.</p>
          <p className="empty-state-links"><Link href="/ai-tools" className="ui-link-arrow">Browse AI tools</Link><Link href="/guides" className="ui-link-arrow">Read our guides</Link></p>
        </div>
      )}
    </Container>
  );
}
