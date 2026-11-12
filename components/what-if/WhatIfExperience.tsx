"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

const DAYS = [
  { title: "Day one: the quiet feels loud.", text: "Your phone is gone. The first choice is smaller than you expected.", choices: ["Call someone from a landline", "Go outside and see who is around"] },
  { title: "Day four: plans move differently.", text: "You missed a message. The day does not stop waiting for you.", choices: ["Ask what happened", "Make a new plan in person"] },
  { title: "Day seven: what comes back?", text: "The phone is returning tonight. Decide what deserves your attention.", choices: ["Keep the useful parts", "Stay a little harder to reach"] },
];

export default function WhatIfExperience() {
  const [day, setDay] = useState(0);
  const current = DAYS[day];
  const complete = day === DAYS.length;

  function choose() {
    setDay((previous) => previous + 1);
  }

  return (
    <main className="mx-auto max-w-[920px] px-5 py-12 sm:px-8 sm:py-20">
      <p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">Brisa What If · Episode 001</p>
      <h1 className="mt-4 max-w-3xl font-heading text-5xl font-black leading-[.94] tracking-[-.06em] sm:text-7xl">Your phone is gone. For seven days.</h1>
      {!complete ? (
        <section aria-live="polite" className="mt-12 border-y border-near-black py-8 sm:mt-16 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-muted">{day + 1} / {DAYS.length}</p>
          <h2 className="mt-4 max-w-2xl font-heading text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-5xl">{current.title}</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">{current.text}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {current.choices.map((choice) => <button key={choice} type="button" onClick={choose} className="min-h-14 border border-near-black px-4 text-left text-sm font-semibold transition-colors hover:bg-near-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric">{choice}<ArrowRight size={15} className="float-right mt-0.5" /></button>)}
          </div>
        </section>
      ) : (
        <section aria-live="polite" className="mt-12 border-y border-near-black py-8 sm:mt-16 sm:py-12">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-electric">Your route is complete</p>
          <h2 className="mt-4 max-w-2xl font-heading text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-5xl">You made your own version of offline.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">The point was never to disappear. It was to notice what you want your attention to do next.</p>
          <div className="mt-8 flex flex-wrap gap-5"><button type="button" onClick={() => setDay(0)} className="min-h-11 bg-near-black px-5 text-sm font-bold text-white hover:bg-electric">Play again</button><Link href="/play" className="inline-flex min-h-11 items-center text-sm font-bold hover:text-electric">Try another Brisa game <ArrowRight size={15} className="ml-2" /></Link></div>
        </section>
      )}
      <p className="mt-8 text-xs text-muted">A short BrisaStory interactive. No account, score or personal data required.</p>
    </main>
  );
}
