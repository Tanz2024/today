"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { captureArticleSource } from "@/lib/homepage-analytics";
import { readHomepageInterests } from "@/lib/homepage-personalization";
import { readRecentArticles } from "@/lib/recently-read";
import { pickPlayArticles, readRecentlyShown, recordShown } from "@/lib/play/recommendation";
import type { ThemeId } from "@/lib/play/themes";
import type { PlayCandidate } from "@/lib/play/candidates";
import type { PlaySession } from "@/lib/play/analytics";

// One story after a game, as a quiet exit ramp — not a feed. Chosen in the
// browser from local signals and the run's collected themes, rotating so a
// replay does not show the same story again.
export default function ArticleRecommendation({
  candidates, session, collected,
}: {
  candidates: PlayCandidate[];
  session: PlaySession;
  collected: Partial<Record<ThemeId, number>>;
}) {
  const [articles, setArticles] = useState<PlayCandidate[]>([]);
  // Picked once per result screen, so a re-run effect cannot rotate twice.
  const pickedRef = useRef<PlayCandidate | null>(null);

  useEffect(() => {
    let recentlyRead: string[] = [];
    let interests: string[] = [];
    let recentlyShown: string[] = [];
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
      recentlyRead = readRecentArticles(storage);
      interests = readHomepageInterests(storage);
      recentlyShown = readRecentlyShown(storage);
    } catch {
      // Storage blocked: fall back to the cold-start pick.
    }
    const picked = pickedRef.current ? [pickedRef.current] : pickPlayArticles(candidates, { recentlyRead, interests, collected, recentlyShown }, 2);
    if (!picked.length) return;
    if (!pickedRef.current) recordShown(storage, picked.map((article) => article.slug));
    pickedRef.current = picked[0];
    queueMicrotask(() => setArticles(picked));
    session.articleImpression(picked.map((article) => article.slug));
  }, [candidates, session, collected]);

  if (!articles.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">{articles.map((article, index) => <Link key={article.slug} href={`/${article.category}/${article.slug}?sourceModule=play`} onClick={() => { session.articleClick(article.slug, index + 1); try { captureArticleSource(window.sessionStorage, "play", article.slug); } catch { /* optional */ } }} className="group flex items-center gap-3 rounded-[var(--editorial-surface-radius)] border border-card-border bg-white px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-muted">From TodayAI</span><span className="mt-0.5 line-clamp-2 font-heading text-[15px] font-semibold leading-snug text-near-black group-hover:text-electric">{article.displayTitle ?? article.title}</span><span className="mt-0.5 block text-[12px] text-muted">Read · {article.readingTime.replace(" read", "")}</span></span><ArrowRight aria-hidden="true" size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-electric" /></Link>)}</div>
  );
}
