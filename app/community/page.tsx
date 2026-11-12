import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Community",
  description: "Ask TodayAI a question anonymously and check the status of stories you have shared with us.",
  path: "/community",
  // Writing is paused; this is a small utility hub, not an editorial page.
  noindex: true,
});

export default async function CommunityPage() {
  const choices = [
    ["Ask something anonymously", "Something you genuinely want people to answer.", "/questions#submit-question", "Ask a question"],
  ] as const;

  return <main className="bg-[#fbfaf7] text-near-black"><section className="border-b border-black/[.08] bg-paper"><Container className="py-20 sm:py-28"><p className="editorial-label text-electric">The TodayAI community</p><h1 className="mt-6 max-w-4xl font-heading text-[clamp(3.2rem,8vw,7.8rem)] font-black leading-[.9] tracking-[-.07em]">Your questions,<br />our community.</h1><p className="mt-7 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">Community writing is currently paused. You can still ask a question and check the status of previous submissions.</p></Container></section><Container className="py-14 sm:py-20"><section aria-labelledby="community-choices-heading"><p id="community-choices-heading" className="editorial-label text-muted">Community options</p><div className="mt-5 grid gap-4">{choices.map(([title, description, href, cta], index) => <Link key={title} href={href} className="editorial-surface group flex min-h-[250px] max-w-xl flex-col justify-between p-6 transition-colors hover:border-electric sm:p-7"><div><span className="font-script text-sm text-electric">0{index + 1}</span><h2 className="mt-8 max-w-xs font-heading text-2xl font-bold leading-[1.02] tracking-[-.04em] sm:text-3xl">{title}</h2><p className="mt-4 max-w-xs leading-6 text-muted">{description}</p></div><span className="mt-8 inline-flex min-h-11 items-center text-sm font-bold text-electric">{cta} <span className="ml-2 transition-transform group-hover:translate-x-1">→</span></span></Link>)}</div></section><div className="mt-20 flex flex-col gap-6 border-t border-black/[.1] pt-8 sm:flex-row sm:items-center sm:justify-between"><div><p className="editorial-label text-muted">Already sent something?</p><p className="mt-2 text-muted">Check your submission status and editorial updates.</p></div><Link href="/community/status" className="inline-flex min-h-11 items-center text-sm font-bold text-electric">View your stories <span className="ml-2">→</span></Link></div></Container></main>;
}
