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

/* ── Homepage (news-publication layout) ─────────────────────────── */

function TopicLink({ article }: { article: AiArticle }) {
  return <Link href={`/news/${article.aiTopic}`} className="hp-topic">{article.aiTopicName}</Link>;
}

/** Author · date · reading time, with the author emphasised. */
function Byline({ article, readingTime = true }: { article: AiArticle; readingTime?: boolean }) {
  const author = resolveArticleAuthor(article);
  return (
    <p className="hp-meta">
      <span className="hp-meta-author">{author.name}</span>
      <time dateTime={article.date}>{formatShortDate(article.date)}</time>
      {readingTime && article.readingTime ? <span>{article.readingTime}</span> : null}
    </p>
  );
}

/** Lead story: 16:9 image, eyebrow, large headline, dek and byline. */
export function LeadStory({ article }: { article: AiArticle }) {
  return (
    <article className="hp-lead">
      {article.image ? (
        <Link href={articlePath(article)} className="hp-lead-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill priority sizes="(min-width: 1024px) 800px, 100vw" className="object-cover" />
        </Link>
      ) : null}
      <div className="hp-lead-copy">
        <p className="hp-eyebrow"><span className="hp-eyebrow-flag">Top story</span><TopicLink article={article} /></p>
        <h3 className="hp-lead-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        {article.description ? <p className="hp-lead-dek">{article.description}</p> : null}
        <Byline article={article} />
      </div>
    </article>
  );
}

/** Secondary top story: topic, headline, date; thumbnail on the right. */
export function RailStory({ article }: { article: AiArticle }) {
  return (
    <article className="hp-rail-story">
      <div className="hp-rail-copy">
        <TopicLink article={article} />
        <h3 className="hp-rail-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <time className="hp-time" dateTime={article.date}>{formatShortDate(article.date)}</time>
      </div>
      {article.image ? (
        <Link href={articlePath(article)} className="hp-rail-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill sizes="(min-width: 1024px) 112px, 88px" className="object-cover" />
        </Link>
      ) : null}
    </article>
  );
}

/** Latest-news row. `featured` gives the first story a larger image and headline. */
export function RiverStory({ article, featured = false }: { article: AiArticle; featured?: boolean }) {
  return (
    <article className={`hp-river-story ${featured ? "is-featured" : ""}`}>
      <div className="hp-river-copy">
        <TopicLink article={article} />
        <h3 className="hp-river-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        {article.description ? <p className="hp-river-dek">{article.description}</p> : null}
        <Byline article={article} readingTime={featured} />
      </div>
      {article.image ? (
        <Link href={articlePath(article)} className="hp-river-media" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt="" fill sizes={featured ? "(min-width: 768px) 420px, 100vw" : "(min-width: 768px) 220px, 96px"} className="object-cover" />
        </Link>
      ) : null}
    </article>
  );
}
