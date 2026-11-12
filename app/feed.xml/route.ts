import { getDiscoverableArticles } from "@/lib/article-catalog";
import { buildRssFeed } from "@/lib/rss";
import { getSiteUrl } from "@/lib/seo";

// Same hourly cache as the rest of the catalogue.
export const revalidate = 3600;

export async function GET() {
  return new Response(buildRssFeed(await getDiscoverableArticles(), getSiteUrl()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
