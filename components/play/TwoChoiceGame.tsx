"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import ShareAction from "@/components/ui/ShareAction";
import SocialResult from "@/components/play/SocialResult";
import { getNewQuestionSet, rememberSeenQuestions } from "@/lib/play";

type Question = { id: string; left: string; right: string };

const FALLBACK_QUESTIONS: readonly Question[] = [
  { id: "fallback-1", left: "Late-night food crawl", right: "Rooftop drinks" },
  { id: "fallback-2", left: "Beach day", right: "City day" },
  { id: "fallback-3", left: "Plan everything", right: "See where the day goes" },
  { id: "fallback-4", left: "Movie night", right: "Game night" },
  { id: "fallback-5", left: "Try somewhere new", right: "Return to the favourite" },
  { id: "fallback-6", left: "Early start", right: "Sleep in" },
  { id: "fallback-7", left: "Go out with everyone", right: "Keep it small" },
  { id: "fallback-8", left: "Spend on the experience", right: "Save the money" },
];

// Generic reusable "pick one of two" game — used for Would You Rather and
// Weekend Picker. No scoring, no streaks, no personality-path gimmick: just
// rounds, a finish screen, restart, and share.
export default function TwoChoiceGame({
  title,
  subtitle,
  questions,
  rounds = 8,
  shareText,
  currentHref,
  accent = "#2563EB",
}: {
  title: string;
  subtitle: string;
  questions: readonly Question[];
  rounds?: number;
  shareText: string;
  currentHref: string;
  /** Colour for the finish card. */
  accent?: string;
}) {
  const availableQuestions = questions.length > 0 ? questions : FALLBACK_QUESTIONS;
  // Deterministic on first render (server and client match) — the real
  // shuffled/deduped session is picked client-side after mount, in the
  // effect below, to avoid a hydration mismatch from Math.random()/localStorage.
  const [session, setSession] = useState(() => availableQuestions.slice(0, rounds));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const question = session[index];

  useEffect(() => {
    // Swaps in the real shuffled session client-side only, after the
    // deterministic SSR-safe initial render above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getNewQuestionSet([...availableQuestions], rounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(pick: string) {
    setPicks((current) => [...current, pick]);
    if (index === session.length - 1) {
      rememberSeenQuestions(session.map((item) => item.id));
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  function restart() {
    setSession(getNewQuestionSet([...questions], rounds));
    setIndex(0);
    setPicks([]);
    setDone(false);
  }

  if (done) {
    return (
      <SocialResult
        game={title}
        headline="Here's what you picked."
        picks={picks}
        accent={accent}
        primary={{ label: "Play again", onClick: restart }}
        share={
          <ShareAction
            title={title}
            text={shareText}
            url={typeof window !== "undefined" ? window.location.href : ""}
            cardParams={{ kicker: title, title: `${session.length} rounds done` }}
          />
        }
        currentHref={currentHref}
      />
    );
  }

  return (
    <div className="border-y border-card-border py-8 sm:py-10">
      <div className="flex justify-between gap-4 text-sm text-muted">
        <span>{subtitle}</span>
        <span className="shrink-0">
          {index + 1} / {session.length}
        </span>
      </div>
      <div className="mt-3 h-1 bg-card-border">
        <div
          className="h-full bg-electric transition-all duration-300"
          style={{ width: `${((index + 1) / session.length) * 100}%` }}
        />
      </div>

      <h2 className="mt-8 font-heading text-3xl font-bold sm:mt-10 sm:text-5xl">{title}</h2>

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose(question.left)}
          className="group flex min-h-20 min-w-0 items-center justify-between gap-3 border border-card-border px-4 py-4 text-left text-lg font-semibold leading-tight hover:border-electric hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric sm:px-5 sm:text-xl"
        >
          <span className="break-words">{question.left}</span>
          <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
        <button
          type="button"
          onClick={() => choose(question.right)}
          className="group flex min-h-20 min-w-0 items-center justify-between gap-3 border border-card-border px-4 py-4 text-left text-lg font-semibold leading-tight hover:border-electric hover:text-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric sm:px-5 sm:text-xl"
        >
          <span className="break-words">{question.right}</span>
          <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
