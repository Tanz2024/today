"use client";

import { useEffect, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { HOMEPAGE_INTERESTS, HOMEPAGE_INTERESTS_KEY, readHomepageInterests, type HomepageInterest } from "@/lib/homepage-personalization";
import { trackHomepageEvent } from "@/lib/homepage-analytics";

export default function InterestSelector() {
  const [selected, setSelected] = useState<HomepageInterest[]>([]);
  useEffect(() => {
    queueMicrotask(() => setSelected(readHomepageInterests(window.localStorage)));
  }, []);
  function toggle(interest: HomepageInterest) {
    const next = selected.includes(interest) ? selected.filter((item) => item !== interest) : [...selected, interest];
    setSelected(next); window.localStorage.setItem(HOMEPAGE_INTERESTS_KEY, JSON.stringify(next));
    trackHomepageEvent(selected.includes(interest) ? "interest_removed" : "interest_selected");
  }
  function reset() { setSelected([]); window.localStorage.removeItem(HOMEPAGE_INTERESTS_KEY); trackHomepageEvent("interest_reset"); }
  return <section aria-labelledby="interests-heading" className="py-2" data-homepage-impression="interest_selector_view">
    <div className="flex items-start justify-between gap-4"><div><h2 id="interests-heading" className="font-heading text-xl font-semibold">Pick what you&apos;re into</h2><p className="mt-1 text-sm text-muted">Optional. We&apos;ll use this to tune future recommendations.</p></div>{selected.length > 0 && <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted hover:text-electric"><ArrowCounterClockwise size={14} />Reset</button>}</div>
    <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">{HOMEPAGE_INTERESTS.map((interest) => <button key={interest} type="button" aria-pressed={selected.includes(interest)} onClick={() => toggle(interest)} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${selected.includes(interest) ? "border-electric bg-electric text-white" : "border-card-border text-near-black hover:border-electric hover:text-electric"}`}>{interest}</button>)}</div>
  </section>;
}
