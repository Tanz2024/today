import Link from "next/link";
import Container from "@/components/ui/Container";
import QuestionSubmissionForm from "@/components/questions/QuestionSubmissionForm";
import { getQuestions } from "@/lib/questions";
import { getCurrentWeeklyQuestion } from "@/lib/editorial-content";
import { buildMetadata } from "@/lib/seo";
import QuestionDiscoveryLinks from "@/components/questions/QuestionDiscoveryLinks";
import { getMostDiscussedRealQuestions, getNewRealQuestions } from "@/lib/question-discovery";

export const metadata = buildMetadata({ title: "Real Questions", description: "Straight answers to the questions people are actually wondering about.", path: "/questions" });
export const revalidate = 600;

export default async function QuestionsPage() {
  const weekly = await getCurrentWeeklyQuestion();
  const weeklyQuestion = typeof weekly?.payload?.question === "string" ? weekly.payload.question : null;
  const mostDiscussed = await getMostDiscussedRealQuestions();
  const newQuestions = getNewRealQuestions(new Set(mostDiscussed.map((item) => item.slug)));
  return <Container className="py-8 sm:py-14"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Real Questions</p><h1 className="mt-3 max-w-2xl font-heading text-3xl font-bold leading-tight tracking-[-.03em] sm:text-5xl">The questions everyone&apos;s thinking about.</h1>{weeklyQuestion && <Link href="/questions/weekly" className="mt-9 block border-y border-electric py-5 hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric"><p className="text-[10px] font-bold uppercase tracking-[.14em]">This week</p><p className="mt-2 text-lg font-semibold sm:text-xl">{weeklyQuestion}</p></Link>}{mostDiscussed.length > 0 && <section className="mt-10"><h2 className="font-heading text-2xl font-bold">Most discussed</h2><QuestionDiscoveryLinks module="most_discussed" items={mostDiscussed} /></section>}<section className="mt-10"><h2 className="font-heading text-2xl font-bold">New questions</h2><QuestionDiscoveryLinks module="new" items={newQuestions} /></section><div className="mt-10 border-y border-card-border">{getQuestions().map((question) => <Link key={question.id} href={`/questions/${question.slug}`} className="flex min-h-16 items-center justify-between gap-6 border-b border-card-border py-5 text-base font-medium last:border-b-0 hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-electric sm:text-lg"><span>{question.question}</span><span aria-hidden>→</span></Link>)}</div><QuestionSubmissionForm /></Container>;
}
