import Link from "next/link";
import type { AiArticle } from "@/lib/ai-content";
import { articlePath, formatShortDate } from "@/lib/ai-content";

/** Static, first-party ticker: every item is a published TodayAI article. */
export default function LatestAiTicker({ articles }: { articles: AiArticle[] }) {
  const items = articles
    .filter((article) => article.slug && article.title && Number.isFinite(new Date(article.date).getTime()))
    .slice(0, 5);
  if (!items.length) return null;

  return (
    <section className="home-news-ticker" aria-labelledby="latest-ai-ticker-heading">
      <h2 id="latest-ai-ticker-heading" className="home-news-ticker-label">Latest AI</h2>
      <ul className="home-news-ticker-list">
        {items.map((article) => (
          <li key={article.slug} className="home-news-ticker-item">
            <Link href={articlePath(article)} className="home-news-ticker-link">
              <span className="home-news-ticker-headline">{article.displayTitle ?? article.title}</span>
              <span className="home-news-ticker-source">TodayAI Editorial · <time dateTime={article.date}>{formatShortDate(article.date)}</time></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
