import { notFound } from "next/navigation";
import Container from "@/components/ui/Container";
import ReactionBar from "@/components/reactions/ReactionBar";
import { getCurrentWeeklyQuestion } from "@/lib/editorial-content";
import QuestionPoll from "@/components/questions/QuestionPoll";
import { getReactionCounts } from "@/lib/reactions";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "This Week's Real Question",
  description: "One current question, answered clearly by TodayAI.",
  path: "/questions/weekly",
});

export default async function WeeklyQuestionPage() {
  const item = await getCurrentWeeklyQuestion();
  if (!item?.payload?.question || !item.payload.shortAnswer) notFound();
  const question = String(item.payload.question);
  const shortAnswer = String(item.payload.shortAnswer);
  const questionSlug = `weekly-${item.editionKey ?? item.externalId ?? "current"}`;
  const poll = {
    id: `weekly-poll-${item.editionKey ?? item.externalId ?? "current"}`,
    question,
    options: [`${questionSlug}-yes`, `${questionSlug}-later`],
    optionLabels: { [`${questionSlug}-yes`]: "Absolutely", [`${questionSlug}-later`]: "I need more time" },
    active: true,
  };
  const targetId = `weekly-question-${item.editionKey ?? item.externalId ?? "current"}`;
  const counts = await getReactionCounts(targetId);

  return (
    <Container className="py-12 sm:py-20">
      <article className="max-w-[740px]">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">This week&apos;s real question</p>
        <h1 className="mt-4 font-heading text-4xl font-bold leading-tight sm:text-6xl">{question}</h1>
        <QuestionPoll poll={poll} questionSlug={questionSlug} />
        <div className="my-10 border-l-2 border-electric pl-5 sm:my-14 sm:pl-6">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Quick answer</p>
          <p className="mt-3 text-xl leading-relaxed">{shortAnswer}</p>
        </div>
        <section className="border-t border-card-border pt-7" aria-labelledby="weekly-reaction-heading">
          <h2 id="weekly-reaction-heading" className="font-heading text-2xl font-bold">How does this feel?</h2>
          <p className="mt-2 text-muted">Tap the reaction that matches you.</p>
          <div className="mt-5"><ReactionBar slug={targetId} initialCounts={counts} emojiOnly /></div>
        </section>
      </article>
    </Container>
  );
}
