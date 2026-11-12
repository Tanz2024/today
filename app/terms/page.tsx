import Container from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of Use",
  description: "The terms that cover use of BrisaStory's content and site.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted">Last updated: September 2026</p>

        <div className="prose-fresh mt-6 text-[1.05rem] leading-relaxed">
          <h2>Informational content only</h2>
          <p>
            Everything on BrisaStory — including articles about relationships, money, self-care, and every
            other category — is written for general informational and entertainment purposes. It is not
            professional medical, mental health, financial, or legal advice, and it isn&apos;t a substitute
            for talking to a qualified professional. If you&apos;re dealing with something serious, please
            talk to someone qualified to help with that specific situation.
          </p>

          <h2>Content ownership</h2>
          <p>
            Articles, graphics, and the BrisaStory name and wordmark are owned by BrisaStory unless otherwise
            noted. You&apos;re welcome to link to our articles or quote short excerpts with attribution and a
            link back. Republishing full articles elsewhere without permission isn&apos;t allowed.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Use BrisaStory the way it&apos;s intended: to read articles, click around, and maybe react to a
            story. Don&apos;t attempt to scrape the site at scale, interfere with its normal operation, or use
            it to distribute anything illegal or harmful.
          </p>

          <h2>External links</h2>
          <p>
            Some articles link to outside sites for further reading. We don&apos;t control those sites and
            aren&apos;t responsible for their content, accuracy, or privacy practices. Links out don&apos;t
            imply an endorsement of everything on that site.
          </p>

          <h2>Community submissions and games</h2>
          <p>
            Community writing is reviewed before publication. Do not submit material you do not have permission
            to share, personal information about someone else, or harmful, illegal, hateful or exploitative
            content. BrisaStory may edit, reject or remove submissions. Games are for entertainment; scores and
            progress are stored locally on your device and do not create a verified public ranking.
          </p>

          <h2>No warranty</h2>
          <p>
            BrisaStory is provided as-is. We do our best to keep articles accurate and up to date, but we
            can&apos;t guarantee the site will always be available, error-free, or perfectly current.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms as the site evolves. Continued use of BrisaStory after a change means
            you accept the updated terms. Meaningful changes will be reflected in the &ldquo;last
            updated&rdquo; date above.
          </p>

          <h2>Contact</h2>
          <p>
Questions about these terms can go to <a href="mailto:hello@brisastory.live">hello@brisastory.live</a>.
          </p>
        </div>
      </div>
    </Container>
  );
}
