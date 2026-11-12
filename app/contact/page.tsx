import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  EnvelopeSimple,
  InstagramLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";

import Container from "@/components/ui/Container";
import ContactForm from "@/components/contact/ContactForm";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Get in touch with TodayAI about story ideas, corrections, collaborations, or anything worth sharing.",
  path: "/contact",
});

/* =========================================================
   STARTUP CONTACT DETAILS

   One inbox is enough for now.
========================================================= */

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ??
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@brisastory.live";

const CONTACT_OPTIONS = [
  {
    number: "01",
    title: "Story idea",
    description:
      "Seen something online, on campus, or in culture that TodayAI should cover?",
    subject: "Story idea",
  },
  {
    number: "02",
    title: "Correction",
    description:
      "Spot something inaccurate, outdated, or unclear in one of our stories?",
    subject: "Correction",
  },
  {
    number: "03",
    title: "Work with TodayAI",
    description:
      "Writing, collaborations, partnerships, or another idea you think could fit.",
    subject: "Work with TodayAI",
  },
  {
    number: "04",
    title: "Just say hi",
    description:
      "Feedback, questions, suggestions, or something else you want to send us.",
    subject: "Hello TodayAI",
  },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    icon: InstagramLogo,
  },
  {
    label: "TikTok",
    href: process.env.NEXT_PUBLIC_TIKTOK_URL,
    icon: TiktokLogo,
  },
  {
    label: "X",
    href: process.env.NEXT_PUBLIC_X_URL,
    icon: XLogo,
  },
  {
    label: "YouTube",
    href: process.env.NEXT_PUBLIC_YOUTUBE_URL,
    icon: YoutubeLogo,
  },
].filter((item) => Boolean(item.href));

export default function ContactPage() {
  return (
    <div>
      {/* ===================================================
          HERO
      ==================================================== */}

      <section className="border-b border-black/[0.08] bg-[#f2efff]">
        <Container className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-[860px]">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-electric
              "
            >
              Contact
            </p>

            <h1
              className="
                mt-4
                max-w-[760px]
                font-heading
                text-[44px]
                font-semibold
                leading-[0.98]
                tracking-[-0.055em]
                text-[#171425]
                sm:text-[62px]
                lg:text-[74px]
              "
            >
              Talk to TodayAI.
            </h1>

            <p
              className="
                mt-6
                max-w-[590px]
                text-[16px]
                leading-[1.65]
                text-[#6b667d]
                sm:text-[18px]
              "
            >
              We&apos;re still growing, so there&apos;s no complicated
              contact maze. Send us what&apos;s on your mind and it reaches
              the TodayAI team.
            </p>
          </div>
        </Container>
      </section>

      {/* ===================================================
          CONTACT
      ==================================================== */}

      <Container className="py-10 sm:py-14 lg:py-16">
        <div
          className="
            grid
            gap-12
            lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]
            lg:gap-20
          "
        >
          {/* ===============================================
              CONTACT REASONS
          ================================================ */}

          <section aria-labelledby="contact-heading">
            <div
              className="
                border-b
                border-black/[0.10]
                pb-5
              "
            >
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-[#7c7f86]
                "
              >
                Get in touch
              </p>

              <h2
                id="contact-heading"
                className="
                  mt-2
                  font-heading
                  text-[28px]
                  font-semibold
                  tracking-[-0.035em]
                  text-[#111111]
                  sm:text-[35px]
                "
              >
                What&apos;s it about?
              </h2>
            </div>

            <div className="divide-y divide-black/[0.09]">
              {CONTACT_OPTIONS.map((option) => (
                <ContactRow
                  key={option.number}
                  {...option}
                />
              ))}
            </div>
            <ContactForm />
          </section>

          {/* ===============================================
              EMAIL CARD
          ================================================ */}

          <aside>
            <div
              className="
                bg-[#dff2b7]
                p-6
                sm:p-7
                lg:sticky
                lg:top-24
              "
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.15em]
                  text-[#617743]
                "
              >
                One inbox
              </p>

              <h2
                className="
                  mt-3
                  font-heading
                  text-[28px]
                  font-semibold
                  leading-[1.08]
                  tracking-[-0.035em]
                  text-[#243018]
                "
              >
                Email us directly.
              </h2>

              <p
                className="
                  mt-3
                  text-[13px]
                  leading-[1.6]
                  text-[#62734e]
                "
              >
                No support tickets. No chatbot. Just send an email and
                someone from TodayAI will read it.
              </p>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="
                  group
                  mt-7
                  inline-flex
                  items-center
                  gap-2
                  border-b
                  border-[#31451e]/30
                  pb-1
                  text-[14px]
                  font-semibold
                  text-[#263719]
                  transition
                  hover:border-[#263719]
                "
              >
                <EnvelopeSimple
                  size={17}
                  weight="bold"
                />

                {CONTACT_EMAIL}

                <ArrowRight
                  size={14}
                  className="
                    transition-transform
                    group-hover:translate-x-1
                  "
                />
              </a>

              <div
                className="
                  mt-8
                  border-t
                  border-[#52683a]/20
                  pt-5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-[#617743]
                  "
                >
                  Replies
                </p>

                <p
                  className="
                    mt-2
                    text-[12px]
                    leading-[1.55]
                    text-[#667653]
                  "
                >
                  We&apos;re a small team. We aim to reply within five business days;
                  corrections are prioritized when they affect accuracy or safety.
                </p>
              </div>
            </div>

            {/* ===============================================
                SOCIALS
            ================================================ */}

            {SOCIALS.length > 0 && (
              <div
                className="
                  mt-6
                  border-t
                  border-black/[0.09]
                  pt-5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.15em]
                    text-[#7c7f86]
                  "
                >
                  Follow TodayAI
                </p>

                <div
                  className="
                    mt-4
                    flex
                    flex-wrap
                    gap-x-5
                    gap-y-3
                  "
                >
                  {SOCIALS.map(
                    ({
                      label,
                      href,
                      icon: Icon,
                    }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          group
                          inline-flex
                          items-center
                          gap-2
                          text-[13px]
                          font-semibold
                          text-[#222222]
                          transition-colors
                          hover:text-electric
                        "
                      >
                        <Icon
                          size={16}
                          weight="bold"
                        />

                        {label}

                        <ArrowUpRight
                          size={12}
                          className="
                            transition-transform
                            group-hover:-translate-y-0.5
                            group-hover:translate-x-0.5
                          "
                        />
                      </a>
                    ),
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ===================================================
            FOOTER NOTE
        ==================================================== */}

        <section
          className="
            mt-16
            border-t
            border-black/[0.09]
            pt-6
            sm:mt-20
            lg:grid
            lg:grid-cols-[.35fr_1fr]
            lg:gap-16
          "
        >
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.15em]
              text-[#7c7f86]
            "
          >
            Corrections
          </p>

          <div className="mt-4 lg:mt-0">
            <p
              className="
                max-w-[680px]
                text-[13px]
                leading-[1.65]
                text-[#777a82]
              "
            >
              If you&apos;re reporting a correction, include the article
              link and tell us exactly what you think needs reviewing.
            </p>

            <Link
              href="/"
              className="
                group
                mt-6
                inline-flex
                items-center
                gap-2
                text-[13px]
                font-semibold
                text-electric
              "
            >
              Back to TodayAI

              <ArrowRight
                size={14}
                className="
                  transition-transform
                  group-hover:translate-x-1
                "
              />
            </Link>
          </div>
        </section>
      </Container>
    </div>
  );
}

/* =========================================================
   CONTACT ROW
========================================================= */

function ContactRow({
  number,
  title,
  description,
  subject,
}: {
  number: string;
  title: string;
  description: string;
  subject: string;
}) {
  const mailto =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent(`[TodayAI] ${subject}`)}`;

  return (
    <a
      href={mailto}
      className="
        group
        grid
        gap-3
        py-6
        sm:grid-cols-[42px_minmax(0,1fr)_auto]
        sm:items-center
        sm:gap-5
        sm:py-7
      "
    >
      <span
        className="
          font-mono
          text-[10px]
          text-[#aaa8af]
        "
      >
        {number}
      </span>

      <div>
        <h3
          className="
            font-heading
            text-[21px]
            font-semibold
            tracking-[-0.025em]
            text-[#161616]
            transition-colors
            group-hover:text-electric
            sm:text-[24px]
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-2
            max-w-[600px]
            text-[13px]
            leading-[1.6]
            text-[#777a82]
          "
        >
          {description}
        </p>
      </div>

      <ArrowRight
        size={16}
        className="
          hidden
          text-[#a0a2a8]
          transition-all
          group-hover:translate-x-1
          group-hover:text-electric
          sm:block
        "
      />
    </a>
  );
}
