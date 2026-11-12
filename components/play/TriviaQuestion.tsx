"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import TryAnotherGame from "@/components/play/TryAnotherGame";

// Today's trivia question. Once answered it turns into a small quiz-show
// result: the verdict, the score, the explanation, and where to go next.
export default function TriviaQuestion({ question, options, correctAnswer, explanation }: { question: string; options: string[]; correctAnswer: string; explanation: string }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const correct = answer === correctAnswer;
  return (
    <div className="border-y border-card-border py-8">
      <h2 className="font-heading text-3xl font-bold sm:text-5xl">{question}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={answer !== null}
            onClick={() => setAnswer(option)}
            className={`min-h-14 rounded-[10px] border px-4 py-3 text-left font-semibold transition-colors ${
              answer === null ? "border-card-border hover:border-electric"
                : option === correctAnswer ? "border-green-600 bg-green-50 text-green-800"
                  : option === answer ? "border-red-500 bg-red-50 text-red-700" : "border-card-border text-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {answer && (
        <div className="mt-6 max-w-lg" aria-live="polite">
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-[44px] font-bold leading-none tracking-[-.03em] text-near-black">{correct ? "1 / 1" : "0 / 1"}</p>
            <p className={`rounded-[4px] px-2 py-0.5 font-heading text-[18px] font-bold ${correct ? "bg-[#FFE36E] text-near-black" : "bg-black/[.06] text-near-black"}`}>
              {correct ? "You know your stuff" : "Not quite"}
            </p>
          </div>
          <p className="mt-3 text-[15px] leading-[1.55] text-muted">{explanation}</p>
          <p className="mt-2 text-[13px] text-muted">New question tomorrow.</p>
          <Link href="/play/red-flag-green-flag" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-near-black px-6 font-heading text-[15px] font-semibold text-white hover:bg-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric">
            Try Red Flag / Green Flag <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <TryAnotherGame currentHref="/play/red-flag-green-flag" />
        </div>
      )}
    </div>
  );
}
