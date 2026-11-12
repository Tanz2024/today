import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Editorial Policy",
  description:
    "How TodayAI researches, writes, corrects and publishes its articles, and what the TodayAI Editorial byline means.",
  path: "/editorial-policy",
});

export default function EditorialPolicyPage() {
  return (
    <div>
      <section className="border-b border-black/[0.08] bg-paper">
        <Container className="py-12 sm:py-16 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-electric">Editorial Policy</p>
          <h1 className="mt-4 max-w-[760px] font-heading text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] text-[#171425] sm:text-[52px]">
            How we write, source and correct our stories.
          </h1>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="prose-fresh mx-auto max-w-2xl text-[17px] leading-[1.7]">
          <h2>What &ldquo;TodayAI Editorial&rdquo; means</h2>
          <p>
            Articles published under the TodayAI Editorial byline are researched and written by the
            TodayAI team collectively, rather than credited to a single named writer. We use this byline
            consistently while the publication grows rather than inventing individual author names or
            credentials that don&apos;t exist.
          </p>

          <h2>How we write</h2>
          <p>
            Every article aims to answer its headline directly, without padding, fake urgency, or unnecessary
            filler. Where a topic touches medical, legal, or financial decisions, we say plainly that readers
            should talk to a qualified professional rather than treating our articles as that professional
            advice.
          </p>

          <h2>Sourcing</h2>
          <p>
            Where an article makes a factual claim that benefits from a reference, we link to the source
            directly in the text. We don&apos;t fabricate statistics, studies, or quotes, and we don&apos;t
            attribute claims to reviewers or sources that didn&apos;t actually review or provide them.
          </p>

          <h2>Corrections</h2>
          <p>
            If you spot something inaccurate or out of date, tell us via our{" "}
            <Link href="/contact">contact page</Link>. When we correct a published article, we update the
            &ldquo;Updated&rdquo; date shown on that article — we don&apos;t silently rewrite claims without
            leaving a trace.
          </p>

          <h2>AI assistance</h2>
          <p>
            We may use software to help research, organize drafts, suggest headlines or identify missing
            context. AI does not replace editorial judgment: a TodayAI editor remains responsible for the
            final copy, source checks, safety review and publication decision. We do not present invented
            reporting, quotes or personal experience as fact.
          </p>

          <h2>Independence</h2>
          <p>
            Our recommendations aren&apos;t for sale. Where a page includes advertising, it&apos;s kept visually
            separate from editorial content and never disguised as an article.
          </p>

          <h2 id="advertising">Advertising, affiliate links and sponsorship</h2>
          <p>
            Advertisements are labelled &ldquo;Advertisement&rdquo; and use advertising cookies and personalisation only according
            to your <Link href="/privacy">privacy choices</Link>. If a page contains affiliate links, it says so near
            those links, and the links are marked as sponsored for search engines. Sponsored placements are
            labelled with the sponsor&apos;s name. Listings in our AI tools directory are not paid placements,
            and a commercial relationship never decides whether or how we cover a product.
          </p>

          <h2>Reactions and polls</h2>
          <p>
            Article reactions and poll results shown on TodayAI reflect real, anonymous reader activity —
            see our <Link href="/privacy">privacy page</Link> for how that data is handled. We don&apos;t
            fabricate reaction counts, vote totals, or engagement numbers.
          </p>

          <p>
            Questions about this policy or a specific article? Reach us through our{" "}
            <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </Container>
    </div>
  );
}
