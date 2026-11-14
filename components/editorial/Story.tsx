import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import type { AiArticle } from "@/lib/ai-content";
import { articlePath, formatShortDate } from "@/lib/ai-content";
import { resolveArticleAuthor } from "@/lib/structured-data";

function title(article: AiArticle) {
  return article.displayTitle ?? article.title;
}

/** Topic/type labels removed from cards by request; kept as a no-op so call sites stay simple. */
export function StoryKicker(_props: { article: AiArticle }) {
  return null;
}

export function StoryMeta({ article }: { article: AiArticle }) {
  return (
    <p className="story-meta">
      <time dateTime={article.date}>{formatShortDate(article.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{article.readingTime}</span>
    </p>
  );
}

/** Timeline row for chronological feeds. */
export function TimelineStory({ article }: { article: AiArticle }) {
  return (
    <article className="timeline-story">
      <time className="timeline-story-date" dateTime={article.date}>{formatShortDate(article.date)}</time>
      <div className="timeline-story-body">
        <StoryKicker article={article} />
        <h3 className="timeline-story-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <p className="timeline-story-dek">{article.description}</p>
      </div>
      <Link href={articlePath(article)} className="timeline-story-media" tabIndex={-1} aria-hidden="true">
        {article.image ? <Image src={article.image} alt="" fill sizes="(min-width: 768px) 200px, 96px" className="object-cover" /> : null}
      </Link>
    </article>
  );
}

/** Guide/tutorial card: format-first, text-led. */
export function GuideCard({ article }: { article: AiArticle }) {
  return (
    <article className="guide-card">
      {article.image ? (
        <Link href={articlePath(article)} className="guide-card-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />
        </Link>
      ) : null}
      <h3 className="guide-card-title"><Link href={articlePath(article)} className="stretched-link">{title(article)}</Link></h3>
      <p className="guide-card-dek">{article.description}</p>
      <p className="story-meta mt-auto pt-4">{article.aiTopicName} · {article.readingTime}</p>
    </article>
  );
}

/**
 * Homepage editorial hero: large image on the left, story on the right
 * (stacked image-first on phones). Real article data only; the byline comes
 * from the same resolver the article page uses.
 */
export function FeatureHero({ article }: { article: AiArticle }) {
  const author = resolveArticleAuthor(article);
  return (
    <article className={`feature-hero ${article.image ? "" : "feature-hero-text"}`}>
      {article.image ? (
        <Link href={articlePath(article)} className="feature-hero-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
        </Link>
      ) : null}
      <div className="feature-hero-copy">
        <StoryKicker article={article} />
        <h2 className="feature-hero-title"><Link href={articlePath(article)}>{title(article)}</Link></h2>
        <p className="feature-hero-dek">{article.description}</p>
        <p className="feature-hero-byline">
          <span>By {author.name}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.date}>{formatShortDate(article.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{article.readingTime}</span>
        </p>
        <Link href={articlePath(article)} className="feature-hero-link">Read the story <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

/** Standard card: image, category, headline, date. Headline leads. */
export function StoryCard({ article }: { article: AiArticle }) {
  return (
    <article className="story-card">
      <Link href={articlePath(article)} className="story-card-media" tabIndex={-1} aria-hidden="true">
        {article.image ? <Image src={article.image} alt="" fill sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 100vw" className="object-cover" /> : null}
      </Link>
      <StoryKicker article={article} />
      <h3 className="story-card-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
      <StoryMeta article={article} />
    </article>
  );
}

/** Compact, text-led row for secondary lists. */
export function CompactStory({ article }: { article: AiArticle }) {
  return (
    <article className="compact-story">
      <div className="compact-story-copy">
        <StoryKicker article={article} />
        <h3 className="compact-story-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <StoryMeta article={article} />
      </div>
      {article.image ? (
        <Link href={articlePath(article)} className="compact-story-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill sizes="96px" className="object-cover" />
        </Link>
      ) : null}
    </article>
  );
}
