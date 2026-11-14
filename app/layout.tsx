import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConsentManager from "@/components/privacy/ConsentManager";
import { FEED_ALTERNATES, INDEXABLE_ROBOTS, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/seo/JsonLd";
import ConsentAwareScripts from "@/components/privacy/ConsentAwareScripts";

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
const PRIVACY_MESSAGING_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED === "true";

// Geist (SIL Open Font License) is self-hosted from app/fonts, so builds
// never depend on a font CDN.
const geist = localFont({
  src: [
    { path: "./fonts/geist-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/geist-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "AI news and guides, free AI tools, AI games and factual AI software comparisons from TodayAI.",
  applicationName: SITE_NAME,
  // No canonical or og:url here: they would be inherited by every route that
  // lacks its own metadata and point it at the homepage. Pages set their own
  // via buildMetadata(). The feed link is safe to inherit.
  alternates: FEED_ALTERNATES,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "AI news and guides, free AI tools, AI games and AI software comparisons.",
  },
  twitter: { card: "summary_large_image" },
  robots: INDEXABLE_ROBOTS,
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(getSiteUrl()), websiteJsonLd(getSiteUrl())],
  };

  return (
    <html
      lang="en"
      className={`${geist.variable} h-full antialiased`}
    >
      <head>
        {/* Site ownership verification for AdSense; loads no script. */}
        <meta name="google-adsense-account" content="ca-pub-5814338716030863" />
        {/* The AdSense loader is only needed when ad slots can render, or when
            Google Privacy & messaging is on (its messages require the tag).
            NEXT_PUBLIC_ADSENSE_LOADER=true also loads it for a site review
            without enabling slots. */}
        {ADS_ENABLED || PRIVACY_MESSAGING_ENABLED || process.env.NEXT_PUBLIC_ADSENSE_LOADER === "true" ? (
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5814338716030863" crossOrigin="anonymous" />
        ) : null}
        {PRIVACY_MESSAGING_ENABLED ? (
          <script async src="https://fundingchoicesmessages.google.com/i/pub-5814338716030863/page/message.js?ers=1" />
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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg">
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <ConsentManager />
      </body>
    </html>
  );
}
