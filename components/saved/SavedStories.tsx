"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SavedArticle = { slug: string; category: string; title: string; description: string };

export default function SavedStories({ articles }: { articles: SavedArticle[] }) {
  const [saved, setSaved] = useState<SavedArticle[]>([]);

  useEffect(() => {
    const keys = new Set<string>();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("brisastory:saved:")) keys.add(key.slice("brisastory:saved:".length));
    }
    queueMicrotask(() => setSaved(articles.filter((article) => keys.has(article.slug))));
  }, [articles]);

  if (saved.length === 0) {
    const recommendations = articles.slice(0, 3);
    return <section className="mt-10" aria-labelledby="saved-empty-heading"><div className="editorial-surface bg-white p-6 sm:p-8"><p className="editorial-label text-electric">Your reading list</p><h2 id="saved-empty-heading" className="mt-3 font-heading text-3xl font-bold tracking-[-.04em] sm:text-4xl">Nothing saved yet.</h2><p className="mt-3 max-w-lg leading-7 text-muted">Save stories you want to come back to. They stay on this device.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-electric">Explore today&apos;s stories <span className="ml-2">→</span></Link></div><div className="mt-12"><p className="editorial-label text-muted">You might like</p><div className="mt-4 grid gap-4 sm:grid-cols-3">{recommendations.map((article) => <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="editorial-surface group bg-white p-5 transition-colors hover:border-electric"><p className="editorial-label">{article.category}</p><h3 className="mt-5 font-heading text-xl font-semibold leading-tight tracking-[-.025em] group-hover:text-electric">{article.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{article.description}</p><span className="mt-5 block text-sm font-bold text-electric">Read story →</span></Link>)}</div></div></section>;
  }

  return <div className="mt-8 divide-y divide-card-border border-y border-card-border">{saved.map((article) => <Link key={article.slug} href={`/${article.category}/${article.slug}`} className="block py-5 transition-colors hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"><p className="font-heading text-xl font-semibold">{article.title}</p><p className="mt-1 text-sm text-muted">{article.description}</p></Link>)}</div>;
}
