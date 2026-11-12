"use client";
import { trackHomepageEvent } from "@/lib/homepage-analytics";
import type { ReactNode } from "react";
export default function QuestionAnalyticsLink({ href, questionSlug, targetQuestionSlug, relationType, children, className }: { href: string; questionSlug: string; targetQuestionSlug: string; relationType?: string; children: ReactNode; className?: string }) {
  return <a href={href} className={className} onClick={() => trackHomepageEvent("related_question_click", { questionSlug, targetQuestionSlug, ...(relationType ? { relationType } : {}) })}>{children}</a>;
}
