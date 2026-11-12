import Link from "next/link";
import type { ArticleAuthor } from "@/lib/structured-data";

// Shows the same author identity as the byline and Article schema
// (resolveArticleAuthor). Organization bylines explain the shared team
// byline; community contributors are credited by name, linked to their
// public profile when one exists.
export default function AuthorInfo({
  author,
  authorName = "TodayAI Editorial",
}: {
  author?: ArticleAuthor;
  authorName?: string;
}) {
  const name = author?.name ?? authorName;
  const isContributor = author?.kind === "person";
  const initials = isContributor
    ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BS"
    : "BS";

  return (
    <section aria-labelledby="article-author-heading" className="mt-16 border-t border-card-border pt-8">
      <h2 id="article-author-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">
        About the author
      </h2>

      <div className="mt-3 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eae5ff] font-heading text-[15px] font-semibold text-electric">
          {initials}
        </div>

        <div>
          <p className="font-medium text-near-black">
            {author?.profilePath ? (
              <Link href={author.profilePath} rel="author" className="hover:text-electric hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
          <p className="mt-1 max-w-[560px] text-[14px] leading-[1.6] text-muted">
            {isContributor ? (
              <>
                Shared with TodayAI by a community contributor and reviewed by our editors before publishing.{" "}
              </>
            ) : (
              <>
                Written and researched by the TodayAI team. We publish under this shared byline rather than
                crediting individual writers while the publication grows.{" "}
              </>
            )}
            <Link href="/editorial-policy" className="font-medium text-electric hover:underline">
              Read our editorial policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
