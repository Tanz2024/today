import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import type { AiArticle } from "@/lib/ai-content";
import { articlePath, formatShortDate } from "@/lib/ai-content";
import { CONTENT_TYPE_LABELS } from "@/lib/ai-taxonomy";

function title(article: AiArticle) {
  return article.displayTitle ?? article.title;
}

export function StoryKicker({ article }: { article: AiArticle }) {
  return (
    <p className="story-kicker">
      <Link href={`/news/${article.aiTopic}`} className="story-kicker-topic">{article.aiTopicName}</Link>
      {article.contentKind !== "news" ? <span className="story-kicker-type">{CONTENT_TYPE_LABELS[article.contentKind]}</span> : null}
    </p>
  );
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

/** Dominant story: large 16:9 image, headline, dek. */
export function LeadStory({ article, priority = false }: { article: AiArticle; priority?: boolean }) {
  return (
    <article className="lead-story">
      <Link href={articlePath(article)} className="lead-story-media" tabIndex={-1} aria-hidden="true">
        {article.image ? <Image src={article.image} alt="" fill priority={priority} sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" /> : null}
      </Link>
      <div className="lead-story-copy">
        <StoryKicker article={article} />
        <h3 className="lead-story-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <p className="lead-story-dek">{article.description}</p>
        <StoryMeta article={article} />
      </div>
    </article>
  );
}

/** Supporting story: thumbnail beside the headline. */
export function SideStory({ article }: { article: AiArticle }) {
  return (
    <article className="side-story">
      <div className="side-story-copy">
        <StoryKicker article={article} />
        <h3 className="side-story-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <StoryMeta article={article} />
      </div>
      <Link href={articlePath(article)} className="side-story-media" tabIndex={-1} aria-hidden="true">
        {article.image ? <Image src={article.image} alt="" fill sizes="(min-width: 1024px) 160px, 112px" className="object-cover" /> : null}
      </Link>
    </article>
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

/** Numbered row for ranked lists. */
export function RankedStory({ article, rank }: { article: AiArticle; rank: number }) {
  return (
    <li className="ranked-story">
      <span className="ranked-story-number" aria-hidden="true">{String(rank).padStart(2, "0")}</span>
      <div>
        <h3 className="ranked-story-title"><Link href={articlePath(article)}>{title(article)}</Link></h3>
        <p className="story-meta">{article.aiTopicName} · {article.readingTime}</p>
      </div>
    </li>
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
      <p className="guide-card-type">{CONTENT_TYPE_LABELS[article.contentKind]}</p>
      <h3 className="guide-card-title"><Link href={articlePath(article)} className="stretched-link">{title(article)}</Link></h3>
      <p className="guide-card-dek">{article.description}</p>
      <p className="story-meta mt-auto pt-4">{article.aiTopicName} · {article.readingTime}</p>
    </article>
  );
}
