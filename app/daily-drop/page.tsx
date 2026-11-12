import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";
import drops from "@/content/daily-drops.json";
import type { DailyDrop } from "@/types/daily-drop";

export const metadata = buildMetadata({ title: "Daily Drop Archive", description: "Browse the finite five-minute TodayAI Daily Drop editions.", path: "/daily-drop", noindex: true });

export default function DailyDropArchive() {
  const editions = [...(drops as DailyDrop[])].sort((a, b) => b.date.localeCompare(a.date));
  return <Container className="py-10 sm:py-14">
    <Link href="/" className="text-[12px] font-semibold text-muted hover:text-electric">← Home</Link>
    <header className="mt-8 max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">Daily Drop</p><h1 className="mt-3 font-heading text-[40px] font-semibold leading-[.98] tracking-[-.04em] text-near-black sm:text-[56px]">Your five-minute TodayAI.</h1><p className="mt-4 text-[16px] leading-7 text-muted">One worthwhile story, one useful discovery and one question or challenge. Pick an edition and finish it at your own pace.</p></header>
    <ol className="mt-10 border-t border-near-black/80">{editions.map((edition) => <li key={edition.id} className="border-b border-card-border py-6"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">{edition.date}</p><h2 className="mt-2 font-heading text-[24px] font-semibold leading-tight text-near-black">{edition.storyTitle}</h2><p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted">{edition.storySummary}</p><Link href={edition.storyHref} className="mt-3 inline-flex min-h-11 items-center text-[12px] font-semibold uppercase tracking-[.12em] text-near-black hover:text-electric">Read this edition’s story →</Link></li>)}</ol>
  </Container>;
}
