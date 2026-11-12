"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CaretDown, RssSimple } from "@phosphor-icons/react";
import { EXPLORE_LINKS, TOPIC_LINKS, COMPANY_LINKS } from "@/lib/nav";
import FeedbackLink from "@/components/feedback/FeedbackLink";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import { showFooterNewsletter } from "@/lib/newsletter-placement";
import { openConsentPreferences } from "@/components/privacy/ConsentManager";

const MOBILE_GROUPS = [
  {
    title: "Explore",
    links: EXPLORE_LINKS,
  },
  {
    title: "Topics",
    links: TOPIC_LINKS,
  },
  {
    title: "TodayAI",
    links: COMPANY_LINKS,
  },
] as const;

export default function Footer() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // The story editor has its own fixed mobile creation dock. Keeping the
  // global footer off this focused screen prevents the dock from covering
  // footer content while someone is writing.
  if (pathname === "/community/write") return null;

  const year = new Date().getFullYear();
  const showNewsletter = showFooterNewsletter(pathname);

  function toggleGroup(title: string) {
    setOpenGroup((current) => (current === title ? null : title));
  }

  return (
    <footer className="border-t border-black/[0.08] bg-[#f7f7f5] text-[#111111]">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* =====================================================
            DESKTOP
        ====================================================== */}

        <div className="hidden py-16 md:block lg:py-[72px]">
          <div className="grid grid-cols-12 gap-x-8">
            {/* Brand */}
            <div className="col-span-5 pr-12">
              <Link
                href="/"
                aria-label="TodayAI home"
                className="
                  inline-flex
                  font-heading
                  text-[30px]
                  font-semibold
                  tracking-[-0.045em]
                  transition-opacity
                  duration-150
                  hover:opacity-70
                "
              >
                <span>Today</span>
                <span className="text-[#b21f24]">AI</span>
              </Link>

              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6b6b73]">
                Est. 2026
              </p>

              <p
                className="
                  mt-5
                  max-w-[380px]
                  text-[16px]
                  leading-[1.65]
                  text-[#696b72]
                "
              >
                Culture for real life, online and everything in between.
              </p>

              <p className="font-tagline mt-7 text-[17px]">
                <span className="text-coral">Useful stories.</span>{" "}
                <span className="text-electric">Every day.</span>
              </p>

              <FeedbackLink location="footer" className="mt-5 text-[15px] font-semibold" />

              {showNewsletter && (
                <div className="mt-9 max-w-[380px]">
                  <NewsletterSignup variant="footer" />
                </div>
              )}

            </div>

            <FooterColumn
              title="Explore"
              links={EXPLORE_LINKS}
              className="col-span-2"
            />

            <FooterColumn
              title="Topics"
              links={TOPIC_LINKS}
              className="col-span-3"
            />

            <FooterColumn
              title="TodayAI"
              links={COMPANY_LINKS}
              className="col-span-2"
            />
          </div>
        </div>

        {/* =====================================================
            MOBILE
        ====================================================== */}

        <div className="py-10 md:hidden">
          {/* Brand */}
          <div className="pb-9">
            <Link
              href="/"
              aria-label="TodayAI home"
              className="
                inline-flex min-h-11 items-center
                font-heading
                text-[27px]
                font-semibold
                tracking-[-0.045em]
              "
            >
                <span>Today</span>
                <span className="text-[#b21f24]">AI</span>
            </Link>

            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6b6b73]">
              Est. 2026
            </p>
            <p
              className="
                mt-4
                max-w-[320px]
                text-[15px]
                leading-[1.6]
                text-[#6b6b73]
              "
            >
              Culture for real life, online and everything in between.
            </p>

            {showNewsletter && (
              <div className="mt-7 max-w-[360px]">
                <NewsletterSignup variant="footer" />
              </div>
            )}

            <p className="font-tagline mt-4 text-[16px]">
              <span className="text-coral">Useful stories.</span>{" "}
              <span className="text-electric">Every day.</span>
            </p>
            <FeedbackLink location="footer" className="mt-4 text-[15px] font-semibold" />

          </div>

          {/* Navigation groups */}
          <div className="border-t border-black/[0.1]">
            {MOBILE_GROUPS.map((group) => {
              const open = openGroup === group.title;

              const panelId = `footer-${group.title
                .toLowerCase()
                .replace(/\s+/g, "-")}`;

              return (
                <div
                  key={group.title}
                  className="border-b border-black/[0.1]"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="
                      flex
                      min-h-[58px]
                      w-full
                      items-center
                      justify-between
                      text-left
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-inset
                      focus-visible:ring-[#2563EB]
                    "
                  >
                    <span className="text-[13px] font-medium">
                      {group.title}
                    </span>

                    <CaretDown
                      size={16}
                      weight="regular"
                      className={`
                        text-muted
                        transition-transform
                        duration-200
                        ease-[cubic-bezier(0.22,1,0.36,1)]
                        ${open ? "rotate-180" : ""}
                      `}
                    />
                  </button>

                  <div
                    id={panelId}
                    className={`
                      grid
                      overflow-hidden
                      transition-[grid-template-rows,opacity]
                      duration-200
                      ease-[cubic-bezier(0.22,1,0.36,1)]
                      ${
                        open
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }
                    `}
                  >
                    <div className="overflow-hidden">
                      <ul className="space-y-4 pb-6">
                        {group.links.map(({ label, href }) => (
                          <li key={label}>
                            <Link
                              href={href}
                              className="
                                inline-flex
                                min-h-[36px]
                                items-center
                                text-[15px]
                                text-[#505159]
                                transition-colors
                                duration-150
                                hover:text-[#2563EB]
                              "
                            >
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile legal */}
          <div className="pt-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/privacy"
                className="
                  inline-flex
                  min-h-11
                  items-center
                  text-[13px]
                  text-muted
                  transition-colors
                  hover:text-[#111111]
                "
              >
                Privacy
              </Link>

              <Link
                href="/terms"
                className="
                  inline-flex
                  min-h-11
                  items-center
                  text-[13px]
                  text-muted
                  transition-colors
                  hover:text-[#111111]
                "
              >
                Terms
              </Link>

              <button type="button" onClick={openConsentPreferences} className="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-[#111111]">
                Privacy choices
              </button>

              <a
                href="/feed.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  min-h-11
                  items-center
                  text-[13px]
                  text-muted
                  transition-colors
                  hover:text-[#111111]
                "
              >
                <RssSimple size={14} weight="bold" aria-hidden="true" className="mr-1.5 shrink-0" />
                RSS
              </a>

            </div>

            <p className="mt-7 text-[12px] text-[#8a8a91]">
              © {year} TodayAI
            </p>
          </div>
        </div>

        {/* =====================================================
            DESKTOP LEGAL
        ====================================================== */}

        <div
          className="
            hidden
            min-h-[72px]
            items-center
            justify-between
            border-t
            border-black/[0.08]
            text-[12px]
            text-muted
            md:flex
          "
        >
          <span>© {year} TodayAI</span>

          <div className="flex items-center gap-7">
            <Link
              href="/privacy"
              className="
                inline-flex
                min-h-11
                items-center
                transition-colors
                duration-150
                hover:text-[#111111]
              "
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              className="
                inline-flex
                min-h-11
                items-center
                transition-colors
                duration-150
                hover:text-[#111111]
              "
            >
              Terms
            </Link>

              <button type="button" onClick={openConsentPreferences} className="inline-flex min-h-11 items-center text-[13px] text-muted transition-colors hover:text-[#111111]">
                Privacy choices
              </button>

            <a
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex
                min-h-11
                items-center
                transition-colors
                duration-150
                hover:text-[#111111]
              "
            >
              <RssSimple size={14} weight="bold" aria-hidden="true" className="mr-1.5 shrink-0" />
              RSS
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  links: { label: string; href: string }[];
  className?: string;
};

function FooterColumn({
  title,
  links,
  className = "",
}: FooterColumnProps) {
  return (
    <div className={className}>
      <h2
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.11em]
          text-muted
        "
      >
        {title}
      </h2>

      <ul className="mt-6 space-y-4">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="
                inline-flex
                text-[15px]
                font-normal
                text-[#242428]
                transition-colors
                duration-150
                hover:text-[#2563EB]
              "
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
