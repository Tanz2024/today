"use client";
import { useEffect, useState } from "react";
import { HOMEPAGE_LAST_VISIT_KEY } from "@/lib/homepage-personalization";

export default function HomepageReturnSignal({ latestPublishedAt }: { latestPublishedAt: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const previous = JSON.parse(localStorage.getItem(HOMEPAGE_LAST_VISIT_KEY) ?? "null") as { date?: string; publishedAt?: string } | null;
      queueMicrotask(() => setShow(Boolean(previous?.publishedAt && new Date(latestPublishedAt).getTime() > new Date(previous.publishedAt).getTime())));
      localStorage.setItem(HOMEPAGE_LAST_VISIT_KEY, JSON.stringify({ date: new Date().toISOString(), publishedAt: latestPublishedAt }));
    } catch { /* local storage is optional */ }
  }, [latestPublishedAt]);
  return show ? <p className="border-y border-card-border py-2 text-xs font-medium text-electric" role="status">New since your last visit</p> : null;
}
