import Link from "next/link";
import Container from "@/components/ui/Container";
import ThisOrThat from "@/components/play/ThisOrThat";
import { buildMetadata } from "@/lib/seo";
import TriviaQuestion from "@/components/play/TriviaQuestion";
import { getCurrentTrivia } from "@/lib/editorial-content";

export const metadata = buildMetadata({
  title: "Trivia and Personality Games",
  description: "Low-stakes trivia, personality questions and games to help you know yourself a little better.",
  path: "/play/trivia",
});

const games = [
  ["Brisa Obby", "Don't touch the floor.", "/play/obby"],
  ["Go Out or Stay Home?", "Find out what your social battery wants.", "/play/stay-out"],
  ["Weekend Picker", "Make a plan without overthinking it.", "/play/weekend-picker"],
  ["Would You Rather", "Impossible choices, no wrong answers.", "/play/would-you-rather"],
  ["Red Flag / Green Flag", "Trust your instincts on the tricky stuff.", "/play/red-flag-green-flag"],
  ["Group Chat", "Ask better questions with your people.", "/play/group-chat"],
] as const;

export default async function TriviaPage() {
  const item = await getCurrentTrivia();
  const payload = item?.payload as { question?: string; options?: string[]; correctAnswer?: string; explanation?: string } | undefined;
  return (
    <Container className="py-10 sm:py-16">
      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Play</p>
      <h1 className="mt-3 max-w-3xl font-heading text-5xl font-bold leading-[.98] tracking-[-.05em] sm:text-7xl">
        Know yourself a little better.
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
        Trivia, quick choices and questions for your weekend, your social battery and your group chat.
      </p>

      <div className="mt-10 max-w-5xl">
        {payload?.question && payload.options && payload.correctAnswer && payload.explanation ? <TriviaQuestion question={payload.question} options={payload.options} correctAnswer={payload.correctAnswer} explanation={payload.explanation} /> : <ThisOrThat currentHref="/play/trivia" />}
      </div>

      <section className="mt-16 border-t border-card-border pt-8 sm:mt-20" aria-labelledby="play-more-heading">
        <h2 id="play-more-heading" className="font-heading text-3xl font-semibold tracking-[-.04em] sm:text-4xl">More ways to play</h2>
        <div className="mt-6 grid border-t border-card-border sm:grid-cols-2">
          {games.map(([title, description, href], index) => (
            <Link key={href} href={href} className="group border-b border-card-border py-5 sm:px-5 sm:first:pl-0 sm:nth-[odd]:pl-0 sm:nth-[even]:border-l sm:nth-[even]:pr-0">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-heading text-xl font-semibold group-hover:text-electric">{title}</h3>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
