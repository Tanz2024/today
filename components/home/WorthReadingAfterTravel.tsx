import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import type { ArticleCardData } from "@/types/article";
import { formatArticleRecency } from "@/lib/article-recency";
import { CATEGORIES } from "@/lib/categories";

export default function WorthReadingAfterTravel({ articles }: { articles: ArticleCardData[] }) {
  return <section aria-labelledby="worth-reading-heading" className="pt-2"><div className="grid gap-6 lg:grid-cols-[.38fr_1fr] lg:gap-12"><h2 id="worth-reading-heading" className="font-heading text-[22px] font-semibold tracking-[-0.03em] text-[#111111] sm:text-[34px]">Worth reading</h2><div>{articles.slice(0, 3).map((article, index) => <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="group grid grid-cols-[28px_76px_1fr] gap-2.5 border-b border-black/[0.06] py-4 first:pt-0 sm:grid-cols-[34px_120px_1fr] sm:gap-4 sm:py-5"><span className="pt-1 font-mono text-[11px] text-[#585c63] sm:text-[12px]">{String(index + 1).padStart(2, "0")}</span><div className="relative aspect-[4/3] overflow-hidden bg-[#f1f2f4]"><Image src={article.image} alt="" fill sizes="120px" className="object-cover transition-opacity duration-200 group-hover:opacity-85" /></div><div><h3 className="line-clamp-2 font-heading text-[16px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#111111] transition-colors group-hover:text-[#2563EB] sm:text-[27px]">{article.displayTitle ?? article.title}</h3><p className="mt-2 text-[12px] text-[#4b4f56] sm:mt-3 sm:text-[14px]">{CATEGORIES.find((c) => c.slug === article.category)?.name ?? article.category} · {formatArticleRecency(article.date)}</p></div></Link>)}</div></div></section>;
}
