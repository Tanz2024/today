import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata, getSiteUrl } from "@/lib/seo";
import { aboutPageJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/seo/JsonLd";

export const metadata = buildMetadata({ title: "About", description: "TodayAI is an independent publication about artificial intelligence: AI news and guides, free AI tools, AI games and factual software comparisons.", path: "/about" });

export default function AboutPage() {
  return (
    <Container className="hub">
      <JsonLd data={aboutPageJsonLd(getSiteUrl())} />
      <article className="legal-page">
        <p className="eyebrow">About TodayAI</p>
        <h1 className="detail-title">AI, explained clearly and made useful.</h1>
        <p className="detail-dek">TodayAI is an independent publication about artificial intelligence. We explain what&apos;s changing, build small tools you can actually use, and make AI concepts tangible through games.</p>

        <h2>Our story</h2>
        <p>TodayAI was founded in Asia and publicly launched on 20 September 2026. It now focuses entirely on AI: what it can do, where it falls short, and how to use it with good judgment.</p>

        <h2>What you&apos;ll find here</h2>
        <ul>
          <li><Link href="/news">AI Blog</Link> — dated news, guides and explainers.</li>
          <li><Link href="/tools">AI Tools</Link> — free tools to summarize text, write emails, improve prompts, explain code and plan automations.</li>
          <li><Link href="/play">AI Games</Link> — word and drawing games where a real AI model is part of the play.</li>
          <li><Link href="/compare">Compare</Link> — factual side-by-side tables of AI software, with links to official sites.</li>
        </ul>

        <h2>How we work</h2>
        <p>Every article aims to answer its headline quickly, without fake urgency. We don&apos;t invent ratings, prices, test results or usage numbers. Our AI tools only ever show real model output, and say so plainly when they&apos;re unavailable.</p>

        <h2>Who&apos;s behind it</h2>
        <p>Articles are published under the TodayAI Editorial byline while the publication grows. See our <Link href="/editorial-policy">editorial policy</Link> for how we research, source and correct stories.</p>

        <h2>What we don&apos;t do</h2>
        <p>No account required, no selling your data, and no paid placements in the AI software directory. See our <Link href="/privacy">privacy policy</Link> for details.</p>

        <p>Have a topic suggestion or a correction? Use our <Link href="/contact">contact page</Link>.</p>
      </article>
    </Container>
  );
}
