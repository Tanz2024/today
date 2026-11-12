import { notFound } from "next/navigation";
import Container from "@/components/ui/Container";
import { getQuestion, getQuestions } from "@/lib/questions";
import { FEED_ALTERNATES, buildMetadata, getSiteUrl } from "@/lib/seo";
import { GENERIC_GUIDANCE, QUESTION_GUIDANCE, QUESTION_STRONGER_ARTICLE, questionIndexing } from "@/lib/question-indexing";
import { getArticleBySlug } from "@/lib/articles";
import AuthorInfo from "@/components/article/AuthorInfo";
import QuestionSubmissionForm from "@/components/questions/QuestionSubmissionForm";
import QuestionPoll from "@/components/questions/QuestionPoll";
import QuestionAnalyticsLink from "@/components/questions/QuestionAnalyticsLink";
import QuestionRecommendations from "@/components/questions/QuestionRecommendations";
import { getQuestionPoll } from "@/lib/question-polls";
import { getApprovedQuestionRelations } from "@/lib/question-relations";
import { mergeRelatedQuestions, type RelatedQuestion } from "@/lib/question-relations-core";
import { getRecommendedQuestions } from "@/lib/question-recommendations";


export function generateStaticParams() { return getQuestions().map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const question = getQuestion((await params).slug);
  if (!question) return {};
  const indexing = questionIndexing(question.slug);
  const meta = buildMetadata({ title: question.question, description: question.shortAnswer, path: `/questions/${question.slug}`, noindex: !indexing.index });
  // Covered by a fuller article: point there deliberately. Generic-guidance
  // pages stay reachable but carry no canonical.
  if (!indexing.index && indexing.reason === "covered-by-article" && getArticleBySlug(indexing.article.category, indexing.article.slug)) {
    return { ...meta, alternates: { ...FEED_ALTERNATES, canonical: `${getSiteUrl()}/${indexing.article.category}/${indexing.article.slug}` } };
  }
  return meta;
}
export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const question = getQuestion((await params).slug); if (!question) notFound();
  const sectionCopy = QUESTION_GUIDANCE[question.slug] ?? GENERIC_GUIDANCE;
  const strongerArticle = QUESTION_STRONGER_ARTICLE[question.slug];
  const article = strongerArticle ? getArticleBySlug(strongerArticle.category, strongerArticle.slug) : undefined;
  const editorialRelations = await getApprovedQuestionRelations(question.slug);
  const fallbackQuestions: RelatedQuestion[] = getQuestions().filter((item) => item.slug !== question.slug && item.category === question.category).map((item) => ({ slug: item.slug, question: item.question, relationType: "related" as const }));
  const specialArticleFallback: RelatedQuestion[] = article ? [{ slug: article.slug, question: article.title, relationType: "related" }] : [];
  const relatedQuestions = mergeRelatedQuestions([editorialRelations, fallbackQuestions, specialArticleFallback], question.slug, 3);
  const realQuestionSlugs = new Set(getQuestions().map((item) => item.slug));
  const relatedQuestionSlugs = relatedQuestions.map((item) => item.slug).filter((slug) => realQuestionSlugs.has(slug));
  let recommendations = [] as Awaited<ReturnType<typeof getRecommendedQuestions>>;
  try { recommendations = await getRecommendedQuestions(question.slug, { excludeSlugs: new Set(relatedQuestionSlugs) }); } catch { recommendations = []; }
  const poll = getQuestionPoll(question.slug);
  return <Container className="py-8 sm:py-14"><article className="max-w-[740px]"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Real Question</p><h1 className="mt-3 font-heading text-3xl font-bold leading-tight tracking-[-.03em] sm:text-5xl">{question.question}</h1>{poll && <QuestionPoll poll={poll} questionSlug={question.slug} />}<div className="my-8 border-l-2 border-electric pl-5 sm:my-10 sm:pl-6"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Quick answer</p><p className="mt-3 text-lg leading-relaxed sm:text-xl">{question.shortAnswer}</p></div>{question.sections.map((section,index) => <section key={section} className="border-t border-card-border py-6"><h2 className="font-heading text-xl font-bold sm:text-2xl">{section}</h2><p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">{sectionCopy[index] ?? sectionCopy[sectionCopy.length - 1]}</p></section>)}<AuthorInfo authorName="BrisaStory Questions Desk" /><section className="mt-10 border-t border-card-border pt-7"><h2 className="font-heading text-xl font-bold sm:text-2xl">Related questions</h2>{relatedQuestions.map((item) => <QuestionAnalyticsLink key={item.slug} className="mt-3 block font-semibold text-electric hover:underline" href={item.slug === article?.slug ? `/${article.category}/${article.slug}` : `/questions/${item.slug}`} questionSlug={question.slug} targetQuestionSlug={item.slug} relationType={editorialRelations.some((relation) => relation.slug === item.slug) ? item.relationType : undefined}>{item.question} →</QuestionAnalyticsLink>)}</section><QuestionRecommendations sourceQuestionSlug={question.slug} recommendations={recommendations} /><QuestionSubmissionForm questionSlug={question.slug} /></article></Container>;
}
