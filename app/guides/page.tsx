import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { GuideCard } from "@/components/editorial/Story";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "AI guides & explainers",
  description: "Practical TodayAI guides to using AI well: studying with AI, spotting AI-generated media, and understanding what AI detectors can and can't do.",
  path: "/guides",
});

export default async function GuidesPage() {
  const ai = selectAiArticles(await getPublicDiscoverableArticles());
  const guides = ai.filter((article) => article.contentKind === "guide");
  const explainers = ai.filter((article) => article.contentKind === "explainer");
  return (
    <Container className="hub">
      <PageHeader eyebrow="Guides" title="Guides & explainers" description="Step-by-step how-tos and clear answers to the questions people actually ask about AI." />
      {guides.length ? (
        <section className="hub-section" aria-labelledby="howto-heading">
          <h2 id="howto-heading" className="section-rule-heading">How-to guides</h2>
          <div className="home-guides-grid mt-5">{guides.map((article) => <GuideCard key={article.slug} article={article} />)}</div>
        </section>
      ) : null}
      {explainers.length ? (
        <section className="hub-section" aria-labelledby="explainer-heading">
          <h2 id="explainer-heading" className="section-rule-heading">Explainers</h2>
          <div className="home-guides-grid mt-5">{explainers.map((article) => <GuideCard key={article.slug} article={article} />)}</div>
        </section>
      ) : null}
      {!guides.length && !explainers.length ? (
        <div className="empty-state"><h2>No guides yet</h2><p>Guides will appear here when they are published.</p><p className="empty-state-links"><Link href="/news" className="ui-link-arrow">Read AI news</Link></p></div>
      ) : null}
    </Container>
  );
}
