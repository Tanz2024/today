"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_CONSENT, hasConsentCookie, readConsentCookie, writeConsentCookie, type ConsentPreferences } from "@/lib/consent";

const OPEN_EVENT = "brisastory:open-consent";

export function openConsentPreferences() {
  if (process.env.NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED === "true") {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_API_READY: () => window.googlefc?.showRevocationMessage?.(),
    });
    return;
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function ConsentManager() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_CONSENT);

  useEffect(() => {
    const handleOpen = () => {
      setPreferences(readConsentCookie() ?? DEFAULT_CONSENT);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handleOpen);
    // The initial cookie check is synchronization with browser state; it is
    // intentionally client-only so the server render remains stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasConsentCookie()) setOpen(true);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  function save(next: ConsentPreferences) {
    writeConsentCookie({ analytics: next.analytics, advertising: next.advertising });
    setOpen(false);
  }

  if (process.env.NEXT_PUBLIC_GOOGLE_PRIVACY_MESSAGING_ENABLED === "true" || !open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-2 pb-2 sm:px-5 sm:pb-3" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="privacy-choice-title" className="mx-auto max-h-[calc(100dvh-1rem)] max-w-[920px] overflow-y-auto border border-[#c9c0e8] bg-[#f1edff] p-4 text-[#171425] shadow-[0_8px_40px_rgba(40,30,80,0.16)] sm:max-h-none sm:overflow-visible sm:p-6">
        <p id="privacy-choice-title" className="font-heading text-lg font-semibold sm:text-xl">Privacy choices</p>
        <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#5f5872] sm:text-sm sm:leading-6">We use essential technology to make BrisaStory work. With your permission, we may also use analytics to understand what people enjoy and advertising technology in the future. <Link href="/privacy" className="font-semibold underline underline-offset-2 hover:text-[#6958c7]">Privacy &amp; Cookies</Link></p>
        <div className="mt-4 grid gap-3 border-t border-[#d8d0ef] pt-3 sm:mt-5 sm:gap-4 sm:pt-4 sm:grid-cols-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#6958c7]">Essential</p><p className="mt-1 text-[13px] leading-5 text-[#5f5872] sm:text-sm sm:leading-6">Required for basic site functionality and security.</p><p className="mt-1 text-xs font-semibold">Always on</p></div>
          <label className="flex gap-3"><input type="checkbox" checked={preferences.analytics} onChange={(event) => setPreferences((current) => ({ ...current, analytics: event.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-[#6958c7]" /><span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#6958c7]">Analytics</span><span className="mt-1 block text-[13px] leading-5 text-[#5f5872] sm:text-sm sm:leading-6">Helps us understand which stories and features people use.</span></span></label>
          <label className="flex gap-3"><input type="checkbox" checked={preferences.advertising} onChange={(event) => setPreferences((current) => ({ ...current, advertising: event.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-[#6958c7]" /><span><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-[#6958c7]">Advertising</span><span className="mt-1 block text-[13px] leading-5 text-[#5f5872] sm:text-sm sm:leading-6">Used for advertising, ad measurement and related technologies.</span></span></label>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={() => save(DEFAULT_CONSENT)} className="min-h-11 border border-[#8d86a8] px-4 text-sm font-semibold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6958c7]">Reject optional</button>
          <button type="button" onClick={() => save(preferences)} className="min-h-11 bg-[#171425] px-4 text-sm font-semibold text-white hover:bg-[#342a63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6958c7]">Save choices</button>
          <button type="button" onClick={() => save({ ...preferences, analytics: true, advertising: true })} className="min-h-11 border border-[#8d86a8] px-4 text-sm font-semibold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6958c7]">Accept optional</button>
        </div>
      </section>
    </div>
  );
}
