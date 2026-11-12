"use client";

import { useEffect, useRef } from "react";
import { trackHomepageEvent } from "@/lib/homepage-analytics";
import { recommendationAnalyticsMetadata, type PublicRecommendation } from "@/lib/question-recommendations-core";

export default function QuestionRecommendations({ sourceQuestionSlug, recommendations }: { sourceQuestionSlug: string; recommendations: PublicRecommendation[] }) {
  const impressionSent = useRef(false);
  useEffect(() => {
    if (!impressionSent.current && recommendations.length) {
      impressionSent.current = true;
      recommendations.forEach((item) => trackHomepageEvent("question_recommendation_impression", recommendationAnalyticsMetadata(sourceQuestionSlug, item.slug)));
    }
  }, [sourceQuestionSlug, recommendations]);
  if (!recommendations.length) return null;
  return <section className="mt-10 border-t border-card-border pt-7" aria-labelledby="question-recommendations-heading"><h2 id="question-recommendations-heading" className="font-heading text-xl font-bold sm:text-2xl">You might also want to read</h2>{recommendations.map((item) => <a key={item.slug} className="mt-3 block font-semibold text-electric hover:underline" href={`/questions/${item.slug}`} onClick={() => trackHomepageEvent("question_recommendation_click", recommendationAnalyticsMetadata(sourceQuestionSlug, item.slug))}>{item.title} →</a>)}</section>;
}
