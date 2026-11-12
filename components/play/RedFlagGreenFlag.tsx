"use client";

import { useEffect, useState } from "react";
import { Flag } from "@phosphor-icons/react";
import ShareAction from "@/components/ui/ShareAction";
import SocialResult from "@/components/play/SocialResult";
import { getNewQuestionSet, rememberSeenQuestions } from "@/lib/play";

type Statement = { id: string; statement: string };

export default function RedFlagGreenFlag({
  statements,
  rounds = 8,
  currentHref = "/play/red-flag-green-flag",
}: {
  statements: readonly Statement[];
  rounds?: number;
  currentHref?: string;
}) {
  // Deterministic on first render (server and client match) — the real
  // shuffled/deduped session is picked client-side after mount, in the
  // effect below, to avoid a hydration mismatch from Math.random()/localStorage.
  const [session, setSession] = useState(() => statements.slice(0, rounds));
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({ red: 0, green: 0 });
  const [done, setDone] = useState(false);
  const current = session[index];

  useEffect(() => {
    // Swaps in the real shuffled session client-side only, after the
    // deterministic SSR-safe initial render above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(getNewQuestionSet([...statements], rounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(color: "red" | "green") {
    const next = { ...tally, [color]: tally[color] + 1 };
    setTally(next);
    if (index === session.length - 1) {
      rememberSeenQuestions(session.map((item) => item.id));
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  function restart() {
    setSession(getNewQuestionSet([...statements], rounds));
    setIndex(0);
    setTally({ red: 0, green: 0 });
    setDone(false);
  }

  if (done) {
    // Fixed verdicts from the tally — no generated copy.
    const verdict = tally.red > tally.green
      ? "You don't let much slide."
      : tally.green > tally.red
        ? "You give people a fair chance."
        : "Right down the middle.";
    return (
      <SocialResult
        game="Red Flag / Green Flag"
        headline={<><span className="text-[#16704C]">{tally.green} green</span>, <span className="text-[#9E285A]">{tally.red} red</span>.</>}
        body={verdict}
        accent={tally.red > tally.green ? "#9E285A" : "#16704C"}
        primary={{ label: "Next round", onClick: restart }}
        share={
          <ShareAction
            title="Red Flag / Green Flag"
            text={`I called ${tally.green} green flags and ${tally.red} red ones on TodayAI.`}
            url={typeof window !== "undefined" ? window.location.href : ""}
            cardParams={{ kicker: "Red Flag / Green Flag", title: `${tally.green} green, ${tally.red} red` }}
          />
        }
        currentHref={currentHref}
      />
    );
  }

  return (
    <div className="border-y border-card-border py-8 sm:py-10">
      <div className="flex justify-between gap-4 text-sm text-muted">
        <span>Red flag or green flag?</span>
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

      <h2 className="mt-8 max-w-xl font-heading text-3xl font-bold leading-tight sm:mt-10 sm:text-5xl">
        {current.statement}
      </h2>

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose("red")}
          className="flex min-h-20 items-center justify-center gap-2 border border-card-border px-4 py-4 text-lg font-semibold text-[#9E285A] hover:border-[#9E285A] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#9E285A] sm:text-xl"
        >
          <Flag size={20} weight="fill" aria-hidden />
          Red flag
        </button>
        <button
          type="button"
          onClick={() => choose("green")}
          className="flex min-h-20 items-center justify-center gap-2 border border-card-border px-4 py-4 text-lg font-semibold text-[#16704C] hover:border-[#16704C] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#16704C] sm:text-xl"
        >
          <Flag size={20} weight="fill" aria-hidden />
          Green flag
        </button>
      </div>
    </div>
  );
}
