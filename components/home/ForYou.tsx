"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Article } from "@/types/article";
import { readRecentArticles } from "@/lib/recently-read";
import { hasPersonalizationSignal, readHomepageInterests, scoreArticleForVisitor } from "@/lib/homepage-personalization";
import { trackHomepageEvent } from "@/lib/homepage-analytics";

export default function ForYou({ articles }: { articles: Article[] }) {
  const [signal, setSignal] = useState<{ interests: string[]; recent: string[] } | null>(null);
  useEffect(() => {
    const interests = readHomepageInterests(window.localStorage);
    const recent = readRecentArticles(window.localStorage);
    if (hasPersonalizationSignal(interests, recent)) { queueMicrotask(() => setSignal({ interests, recent })); trackHomepageEvent("for_you_impression"); }
  }, []);
  const ranked = useMemo(() => signal ? [...articles].sort((a, b) => scoreArticleForVisitor(b, { interests: signal.interests, recentlyRead: signal.recent }) - scoreArticleForVisitor(a, { interests: signal.interests, recentlyRead: signal.recent })).slice(0, 3) : [], [articles, signal]);
  if (!signal || ranked.length === 0) return null;
  return <section aria-labelledby="for-you-heading" data-homepage-module="for_you" className="pt-2"><h2 id="for-you-heading" className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">Worth your next few minutes.</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{ranked.map((article) => <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="min-h-20 border border-card-border p-4 hover:border-electric hover:text-electric"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{article.category}</span><h3 className="mt-2 font-heading text-lg font-semibold leading-tight">{article.displayTitle ?? article.title}</h3></Link>)}</div></section>;
}
