"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsentCookie, type ConsentPreferences } from "@/lib/consent";

const CONSENT_EVENT = "brisastory:consent-change";

export default function ConsentAwareScripts({ analyticsId, umamiUrl, umamiWebsiteId }: { analyticsId?: string; umamiUrl?: string; umamiWebsiteId?: string }) {
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    const refresh = () => setPreferences(readConsentCookie());
    refresh();
    window.addEventListener(CONSENT_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_EVENT, refresh);
  }, []);

  const privacyMessaging = process.env.NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED === "true";
  if (privacyMessaging || !preferences) return null;

  return <>
    {umamiUrl && umamiWebsiteId ? <Script src={umamiUrl} data-website-id={umamiWebsiteId} strategy="afterInteractive" /> : null}
    {analyticsId && preferences.analytics ? (
      <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} strategy="afterInteractive" />
        <Script id="google-analytics-consent-aware" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function(){window.dataLayer.push(arguments);}; window.gtag('js', new Date()); window.gtag('config', '${analyticsId}');`}
        </Script>
      </>
    ) : null}
  </>;
}
