"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RssSimple } from "@phosphor-icons/react";
import { COMPANY_LINKS, FOOTER_DISCOVER, FOOTER_EDITORIAL, LEGAL_LINKS, type NavLink } from "@/lib/nav";
import FeedbackLink from "@/components/feedback/FeedbackLink";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import Logo from "@/components/layout/Logo";
import { showFooterNewsletter } from "@/lib/newsletter-placement";
import { openConsentPreferences } from "@/components/privacy/ConsentManager";

const GROUPS: { title: string; links: NavLink[] }[] = [
  { title: "Editorial", links: FOOTER_EDITORIAL },
  { title: "Discover", links: FOOTER_DISCOVER },
  { title: "Company", links: COMPANY_LINKS },
  { title: "Legal", links: LEGAL_LINKS },
];

export default function Footer() {
  const pathname = usePathname();

  // The story editor has its own fixed mobile creation dock; keep the global
  // footer off that focused screen so the dock never covers footer content.
  if (pathname === "/community/write") return null;

  const year = new Date().getFullYear();
  const showNewsletter = showFooterNewsletter(pathname);

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" aria-label="TodayAI home"><Logo tone="dark" /></Link>
          <p className="site-footer-tagline">AI news, tools and guides — explained clearly, for everyone.</p>
          <FeedbackLink location="footer" className="mt-4 text-sm font-semibold text-white/80 hover:text-white" />
          {showNewsletter ? (
            <div className="site-footer-newsletter">
              <NewsletterSignup variant="footer" />
            </div>
          ) : null}
        </div>

        <div className="site-footer-groups">
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="site-footer-group">
              <h2 className="site-footer-heading">{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
                {group.title === "Legal" ? (
                  <li><button type="button" onClick={openConsentPreferences}>Privacy choices</button></li>
                ) : null}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>© {year} TodayAI. All rights reserved.</p>
        <a href="/feed.xml" className="inline-flex items-center gap-1.5"><RssSimple size={14} aria-hidden="true" /> RSS feed</a>
      </div>
    </footer>
  );
}
