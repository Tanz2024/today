import Image from "@/components/ui/MediaImage";
import Link from "next/link";

import Container from "@/components/ui/Container";
import { getAllArticles } from "@/lib/articles";
import { getCategoryMeta } from "@/lib/categories";
import { getManyReactionTotals } from "@/lib/reactions";
import { formatArticleRecency } from "@/lib/article-recency";

export default async function NotFound() {
  const all = getAllArticles();
  const totals = process.env.NEXT_PHASE === "phase-production-build"
    ? new Map<string, number>()
    : await getManyReactionTotals(all.map((article) => article.slug));
  const recommendations = [...all]
    .sort((a, b) => (totals.get(b.slug) ?? 0) - (totals.get(a.slug) ?? 0))
    .slice(0, 3);

  return (
    <Container className="py-10 sm:py-14 lg:py-20">
      <section className="grid overflow-hidden border-y border-black/[0.10] lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <div className="flex min-h-[430px] flex-col justify-between border-b border-black/[0.10] py-8 sm:min-h-[500px] sm:py-12 lg:border-b-0 lg:border-r lg:py-16">
          <div>
            <p className="font-mono text-[12px] font-bold tracking-[0.16em] text-[#74777f]">404</p>
            <h1 className="mt-8 max-w-[650px] font-heading text-[48px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#111111] sm:text-[68px] lg:text-[78px]">This story went missing.</h1>
            <p className="mt-6 max-w-md text-[17px] leading-[1.55] text-[#667085] sm:text-[19px]">Looks like this page isn&apos;t here anymore.</p>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-[14px] font-semibold">
            <Link href="/" className="inline-flex min-h-11 items-center border-b-2 border-electric py-2 text-electric transition-colors hover:text-[#111111]">← Home</Link>
            <Link href="/search" className="inline-flex min-h-11 items-center border-b border-black/[0.22] py-2 text-[#667085] transition-colors hover:border-electric hover:text-electric">Search TodayAI</Link>
          </div>
        </div>
        <div className="relative min-h-[230px] overflow-hidden bg-[#f7f8fa] lg:min-h-[500px]">
          <div aria-hidden="true" className="absolute -right-12 -top-12 font-heading text-[270px] font-semibold leading-none tracking-[-0.12em] text-[#111111]/[0.07] sm:text-[360px] lg:-right-24 lg:-top-20 lg:text-[500px]">404</div>
          <div aria-hidden="true" className="absolute bottom-7 left-7 h-px w-24 bg-electric lg:bottom-12 lg:left-10" />
          <p className="absolute bottom-7 left-7 max-w-[150px] font-mono text-[10px] uppercase tracking-[0.16em] text-[#74777f] lg:bottom-12 lg:left-10">Keep looking. There&apos;s more to read.</p>
        </div>
      </section>

      <section className="mt-16 sm:mt-20" aria-labelledby="recommendations-heading">
        <div className="border-b border-black/[0.10] pb-4"><h2 id="recommendations-heading" className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-[#111111] sm:text-[36px]">Since you&apos;re here</h2></div>
        <div className="grid gap-x-6 sm:grid-cols-3">
          {recommendations.map((article) => {
            const category = getCategoryMeta(article.category)?.name ?? article.category;
            return <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="group border-b border-black/[0.10] py-6 sm:py-7">
              <div className="relative aspect-[16/10] overflow-hidden bg-[#f1f2f4]"><Image src={article.image} alt={article.imageAlt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-opacity duration-200 group-hover:opacity-90" /></div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#74777f]">{category} <span className="mx-1 text-black/25">·</span> {formatArticleRecency(article.date)}</p>
              <h3 className="mt-2 font-heading text-[21px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#111111] transition-colors group-hover:text-electric sm:text-[23px]">{article.displayTitle ?? article.title}</h3>
            </Link>;
          })}
        </div>
      </section>
    </Container>
  );
}
