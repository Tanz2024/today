import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "What TodayAI handles: privacy choices, on-device storage, anonymous read counts, AI tools and games, the contact form, the newsletter and advertising.",
  path: "/privacy",
});

// The real inbox, from configuration (same source as the contact page).
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@brisastory.live";

export default function PrivacyPage() {
  return (
    <Container className="hub">
      <article className="legal-page">
        <p className="eyebrow">Legal</p>
        <h1 className="detail-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: November 2026</p>
        <p>TodayAI is built to collect as little as possible. This page describes what the site handles today.</p>

        <h2>Cookies and privacy choices</h2>
        <p>TodayAI sets one first-party cookie, <code>brisastory_consent</code> (its name predates the TodayAI brand), after you save a privacy choice. It stores a version number and your analytics and advertising choices, not personal information. You can change it at any time with &ldquo;Privacy choices&rdquo; in the footer. If Google Privacy &amp; messaging is enabled, its certified consent message manages applicable regional advertising choices instead.</p>

        <h2>Storage on your device</h2>
        <p>Your browser&apos;s local storage keeps a few preferences and progress markers on this device only: reading text size, stories you save or recently read, your AI Word Detective result for the day, and similar settings. They are not sent to us. Clearing your browser storage removes them.</p>

        <h2>Anonymous reading counts</h2>
        <p>When you read an article, the site may increment anonymous counters for that article (for example, page views and time read). These are stored against the article, not against you, and are used to show reading statistics and pick related stories.</p>

        <h2>AI tools</h2>
        <p>The AI tools (such as the AI Text Summarizer) send the text you enter to a language-model provider (OpenRouter) only when you press the button, and only while the tools are switched on. TodayAI does not store that text. To prevent abuse, a one-way hash of your IP address is used as a short-lived rate-limit key in Redis (hosted by Upstash). Please don&apos;t paste passwords, personal data or confidential material.</p>

        <h2>AI games</h2>
        <p>AI Word Detective and AI Draw &amp; Guess download open-source models from Hugging Face and a runtime from jsDelivr the first time you play. The models run in your browser; your guesses and drawings are not uploaded. Those providers may log standard request data, such as your IP address, under their own policies.</p>

        <h2>Analytics</h2>
        <p>TodayAI may use Umami and/or Google Analytics when they are enabled for production and you have granted the relevant optional consent. They measure aggregate site usage and are not used to identify you.</p>

        <h2>Images</h2>
        <p>Some article images are loaded from external providers, including Unsplash, Pexels and Wikimedia Commons. Your browser requests those images directly, so those providers may log standard request data under their own privacy policies.</p>

        <h2>Contact form</h2>
        <p>Messages sent through the <Link href="/contact">contact page</Link> go to our inbox through the site&apos;s mail provider. They are not used for marketing. Please don&apos;t send sensitive personal information through the form.</p>

        <h2>Newsletter</h2>
        <p>If you sign up for the newsletter, your email address is sent to our newsletter provider so we can deliver it. We use it only for that subscription, and every email has an unsubscribe link.</p>

        <h2>Advertising</h2>
        <p>Advertising units are disabled unless and until they are switched on. A Google AdSense ownership tag may be present while the site is under review. If advertising is enabled, Google Privacy &amp; messaging or another Google-certified consent platform will manage applicable EEA, UK and Swiss consent signals.</p>

        <h2>Changes to this policy</h2>
        <p>If how we handle data changes, we&apos;ll update this page and the date at the top.</p>

        <h2>Contact</h2>
        <p>Questions about this policy can go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </article>
    </Container>
  );
}
