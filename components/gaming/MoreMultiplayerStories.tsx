import Link from "next/link";
import type { Article } from "@/types/article";

export default function MoreMultiplayerStories({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  return <section aria-labelledby="more-multiplayer-heading" className="mt-16 border-t border-card-border pt-8"><h2 id="more-multiplayer-heading" className="font-heading text-2xl font-semibold sm:text-3xl">More Multiplayer Stories</h2><div className="mt-5 divide-y divide-card-border">{articles.map((article) => <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="flex items-center justify-between gap-6 py-4 font-heading text-lg font-medium hover:text-electric"><span>{article.title}</span><span aria-hidden="true">→</span></Link>)}</div></section>;
}
