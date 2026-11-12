import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConsentManager from "@/components/privacy/ConsentManager";
import { FEED_ALTERNATES, INDEXABLE_ROBOTS, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/seo/JsonLd";
import { getFeaturedArticle } from "@/lib/articles";
import ConsentAwareScripts from "@/components/privacy/ConsentAwareScripts";

function articleFeature(category: Parameters<typeof getFeaturedArticle>[0]) {
  const article = getFeaturedArticle(category);
  if (!article) return undefined;
  return {
    title: article.title,
    href: `/${article.category}/${article.slug}`,
    image: article.image,
    category: article.category,
    readingTime: article.readingTime,
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Culture, relationships, campus life, money, music, travel and everyday stories for a new generation.",
  applicationName: SITE_NAME,
  // No canonical or og:url here: they would be inherited by every route that
  // lacks its own metadata and point it at the homepage. Pages set their own
  // via buildMetadata(). The feed link is safe to inherit.
  alternates: FEED_ALTERNATES,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Culture, relationships, university life, money, travel, gaming and everyday life.",
  },
  twitter: { card: "summary_large_image" },
  robots: INDEXABLE_ROBOTS,
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const featuredByMenu = {
    "Culture": articleFeature("culture"),
    "Relationships": articleFeature("relationships"),
    "Campus": articleFeature("campus"),
    "Travel & City Life": articleFeature("travel"),
    "Style": articleFeature("style"),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(getSiteUrl()), websiteJsonLd(getSiteUrl())],
  };

  return (
    <html
      lang="en"
      className="h-full antialiased"
      
    >
      <head>
        <meta name="google-adsense-account" content="ca-pub-5814338716030863" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5814338716030863" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED === "true" ? (
          <>
            {/* Google requires the AdSense tag on the page for published Privacy & messaging messages to display. */}
            <script async src="https://fundingchoicesmessages.google.com/i/pub-5814338716030863/page/message.js?ers=1" />
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd data={jsonLd} />
        <Script id="google-consent-default" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function(){window.dataLayer.push(arguments);}; window.gtag('consent', 'default', {ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500});`}
        </Script>
        <ConsentAwareScripts
          analyticsId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}
          umamiUrl={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
          umamiWebsiteId={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        />
        <Header featuredByMenu={featuredByMenu} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#111111] focus:shadow-lg">
          Skip to content
        </a>
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <ConsentManager />
      </body>
    </html>
  );
}
