"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackHomepageEvent } from "@/lib/homepage-analytics";
import type { DiscoveryItem } from "@/lib/question-discovery-core";

export default function QuestionDiscoveryLinks({ module, items }: { module: "new" | "most_discussed"; items: DiscoveryItem[] }) {
  const sent = useRef(false);
  useEffect(() => { if (sent.current || !items.length) return; sent.current = true; items.forEach((item, index) => trackHomepageEvent("question_discovery_impression", { targetQuestionSlug: item.slug, module, position: index + 1 })); }, [items, module]);
  if (!items.length) return null;
  return <div className="mt-5 border-y border-card-border">{items.map((item) => <Link key={item.slug} href={`/questions/${item.slug}`} className="flex min-h-16 items-center justify-between gap-6 border-b border-card-border py-5 text-base font-medium last:border-b-0 hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-electric" onClick={() => trackHomepageEvent("question_discovery_click", { targetQuestionSlug: item.slug, module, position: items.indexOf(item) + 1 })}><span>{item.title}</span><span aria-hidden>→</span></Link>)}</div>;
}
