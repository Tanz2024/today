"use client";
import { ArrowUpRight } from "@phosphor-icons/react";
import { getFeedbackUrl } from "@/lib/feedback";
import { trackHomepageEvent } from "@/lib/homepage-analytics";

export default function FeedbackLink({ location, className = "" }: { location: "footer" | "mobile_menu"; className?: string }) {
  const href = getFeedbackUrl();
  return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} onClick={() => trackHomepageEvent("feedback_open", { location })} className={`inline-flex min-h-11 items-center gap-1.5 transition-colors hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric ${className}`} aria-label="Give BrisaStory feedback">Feedback <ArrowUpRight size={14} aria-hidden="true" /></a>;
}
