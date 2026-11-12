"use client";
import Link from "next/link";
import { trackTool } from "@/lib/tools/analytics";
import type { ToolName } from "@/lib/tools/analytics";
const ARTICLES = {
  money: [{ href: "/money/student-budget-guide", title: "How to build a student budget" }, { href: "/money/how-much-should-you-save-each-month", title: "How much should you save each month?" }],
  campus: [{ href: "/campus/how-to-study-without-burning-out", title: "How to study without burning out" }, { href: "/campus/first-week-university-guide", title: "Your first week of university" }],
  travel: [{ href: "/travel/first-trip-without-overspending", title: "How to take your first trip without overspending" }, { href: "/travel/travel-with-friends-without-ruining-friendship", title: "Travel with friends without ruining the friendship" }],
} as const;
export default function ToolArticleLinks({ desk, tool }: { desk: keyof typeof ARTICLES; tool: ToolName }) { return <section className="mt-12 border-t border-card-border pt-7"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Keep reading</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{ARTICLES[desk].map((article) => <Link key={article.href} href={article.href} onClick={() => trackTool("tool_article_click", tool, { destination: article.href })} className="border-b border-card-border py-3 font-heading text-lg font-semibold hover:text-electric">{article.title} <span aria-hidden="true">→</span></Link>)}</div></section>; }
