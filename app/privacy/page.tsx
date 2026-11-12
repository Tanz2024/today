import Link from "next/link";
import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How TodayAI handles privacy choices, functional storage, images, and future analytics or advertising.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: September 2026</p>

        <div className="prose-fresh mt-6 text-[1.05rem] leading-relaxed">
          <p>
            TodayAI is built to collect as little as possible. This page describes, honestly, everything
            we do handle — no more, no less.
          </p>

          <h2>Article reactions</h2>
          <p>
            When you tap a reaction (Love it, LOL, Too real, Facts) on an article, we increment an anonymous
            counter stored in Redis (hosted by Upstash) under a key tied to that article&apos;s slug — never
            to you personally. We don&apos;t store an IP address, account ID, or any identifying information
            alongside a reaction. We have no way to trace a reaction back to a specific visitor.
          </p>

          <h2>Local storage</h2>
          <p>
            Your browser&apos;s <code>localStorage</code> remembers which reaction you picked on each
            article (so the button stays highlighted if you come back). This
            data lives only on your device — it&apos;s never sent to us or to any third party. Clearing your
            browser storage clears it.
          </p>


          <h2>Cookies</h2>
          <p>
            TodayAI sets the first-party <code>brisastory_consent</code> cookie after you save a privacy
            choice. It contains a version and your analytics and advertising choices, not personal information.
            You can change it at any time using &ldquo;Privacy choices&rdquo; in the footer. When Google Privacy &amp;
            messaging is enabled for production, its certified consent message manages applicable regional
            advertising choices instead.
          </p>

          <h2>Analytics</h2>
          <p>
            TodayAI may use Umami and/or Google Analytics when the corresponding production setting is
            enabled and the relevant optional consent has been granted. These tools measure aggregate site
            usage and performance. The site does not use analytics to identify you personally.
          </p>

          <h2>Images</h2>
          <p>
            Article images are served from external image providers including Unsplash, Pexels and Wikimedia
            Commons. Loading these images means your browser makes a request to those servers, which may log
            standard request data (like your IP address) according to their own privacy policies.
          </p>

          <h2>Contact form</h2>
          <p>
            Our <Link href="/contact">contact page</Link> includes a form for work enquiries and general
            messages. Submissions are sent to our configured inbox through the site&apos;s mail provider and
            are not used for marketing unless you separately subscribe to the newsletter. Please do not send
            sensitive personal information through the form.
          </p>

          <h2>Newsletter</h2>
          <p>
            If you submit the newsletter signup shown on the homepage or article pages, your email address is
            sent to our configured newsletter provider so we can deliver The Fresh Drop. We use it only for
            that subscription, and you can unsubscribe using the link in any newsletter email. If the provider
            is temporarily unavailable, the signup is not completed.
          </p>

          <h2>Advertising</h2>
          <p>
            TodayAI is not currently serving Google advertisements, and manual advertising units remain
            disabled. Google AdSense ownership code may be present while the site is undergoing review. If
            advertising is enabled in the future, Google Privacy &amp; messaging or another Google-certified TCF
            CMP will manage applicable EEA, UK and Swiss consent signals; ad requests remain blocked until the
            site is approved and the required configuration is complete.
          </p>

          <h2>Children&apos;s privacy</h2>
          <p>
            TodayAI is written with younger readers in mind, but we don&apos;t knowingly collect personal
            information from anyone, regardless of age, beyond the anonymous mechanisms described above.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If how we handle data changes, we&apos;ll update this page and the &ldquo;last updated&rdquo; date
            at the top.
          </p>

          <h2>Contact</h2>
          <p>
Questions about this policy can go to <a href="mailto:hello@brisastory.live">hello@brisastory.live</a>.
          </p>
        </div>
      </div>
    </Container>
  );
}
