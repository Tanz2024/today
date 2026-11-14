import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of Use",
  description: "The terms that cover use of TodayAI's articles, AI tools, AI games and site.",
  path: "/terms",
});

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@brisastory.live";

export default function TermsPage() {
  return (
    <Container className="hub">
      <article className="legal-page">
        <p className="eyebrow">Legal</p>
        <h1 className="detail-title">Terms of Use</h1>
        <p className="legal-updated">Last updated: November 2026</p>

        <h2>Informational content only</h2>
        <p>TodayAI&apos;s articles, guides and comparisons are written for general information. They are not professional, legal, financial or medical advice. Check important decisions with a qualified professional.</p>

        <h2>AI tools</h2>
        <p>The AI tools generate text with a language model. Output can be wrong, incomplete or out of date, so check it before relying on it. You&apos;re responsible for what you enter and how you use the result. Don&apos;t submit content you don&apos;t have the right to share, personal data about others, secrets or illegal material. Usage limits apply, and the tools may be unavailable at times.</p>

        <h2>AI games</h2>
        <p>The games are for entertainment. AI scores and guesses come from automated models and can be surprising or wrong. Progress is stored on your device and isn&apos;t a verified public ranking.</p>

        <h2>Comparisons and product information</h2>
        <p>Product information comes from official sources and is checked on the dates shown. Products and prices change, so confirm details on the provider&apos;s own site.</p>

        <h2>Content ownership</h2>
        <p>Articles, graphics and the TodayAI name are owned by TodayAI unless otherwise noted. You&apos;re welcome to link to our articles or quote short excerpts with attribution and a link back. Republishing full articles without permission isn&apos;t allowed.</p>

        <h2>Acceptable use</h2>
        <p>Don&apos;t scrape the site at scale, try to get around usage limits, interfere with its normal operation, or use it to distribute anything illegal or harmful.</p>

        <h2>External links</h2>
        <p>Some pages link to outside sites. We don&apos;t control them and aren&apos;t responsible for their content, accuracy or privacy practices.</p>

        <h2>No warranty</h2>
        <p>TodayAI is provided as-is. We work to keep it accurate and available, but can&apos;t guarantee it will always be available, error-free or current.</p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms as the site changes. Meaningful changes will be reflected in the date above.</p>

        <h2>Contact</h2>
        <p>Questions about these terms can go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </article>
    </Container>
  );
}
