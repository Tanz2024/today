import Container from "@/components/ui/Container";
import SavedStories from "@/components/saved/SavedStories";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Saved stories", description: "Find the BrisaStory stories you saved for later.", path: "/saved", noindex: true });

// Saved slugs live on the device; the list includes Appwrite stories so they
// still resolve after reload. Refreshes with the shared article cache.
export const revalidate = 3600;

export default async function SavedPage() {
  return <Container className="py-10 sm:py-16"><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-electric">Your reading list</p><h1 className="mt-3 font-heading text-4xl font-bold tracking-[-.04em] sm:text-5xl">Saved stories</h1><p className="mt-3 max-w-xl text-base leading-7 text-muted">A quiet place to return to the stories you marked for later. Saved stories stay on this device.</p><SavedStories articles={(await getDiscoverableArticles()).map(({ slug, category, title, description }) => ({ slug, category, title, description }))} /></Container>;
}
