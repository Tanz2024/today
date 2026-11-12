import Link from "next/link";
import type { Article } from "@/types/article";

// One in-body editorial link, styled as part of the text (not a card), so it
// never reads like an ad.
export default function ReadNext({ article }: { article: Article }) {
  return (
    <aside aria-label="Read next" className="not-prose my-8 border-l-2 border-electric pl-4 sm:my-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">Read next</p>
      <Link href={`/${article.category}/${article.slug}`} className="mt-1 block font-heading text-[18px] font-semibold leading-snug text-near-black hover:text-electric sm:text-[20px]">
        {article.displayTitle ?? article.title}
      </Link>
    </aside>
  );
}
