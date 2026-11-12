"use client";

import { useEffect } from "react";
import { captureArticleSource, trackHomepageEvent } from "@/lib/homepage-analytics";

export default function HomepageSignals() {
  useEffect(() => {
    trackHomepageEvent("homepage_view");
    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const event = entry.target.getAttribute("data-homepage-impression") as Parameters<typeof trackHomepageEvent>[0] | null;
        if (event && !seen.has(event)) { seen.add(event); const moduleName = entry.target.getAttribute("data-homepage-module"); trackHomepageEvent(event, moduleName ? { module: moduleName } : undefined); }
      }
    }, { threshold: 0.25 });
    document.querySelectorAll("[data-homepage-impression]").forEach((element) => observer.observe(element));
    function click(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const link = target.closest("a");
      const moduleElement = link?.closest<HTMLElement>("[data-homepage-module]");
      if (!link || !moduleElement) return;
      const source = moduleElement.dataset.homepageModule;
      const events: Record<string, Parameters<typeof trackHomepageEvent>[0]> = {
        daily_drop: "daily_drop_click", trending: "trending_story_click", fresh: "fresh_story_click",
        real_question: "real_question_click", on_repeat: "on_repeat_click", on_screen: "on_screen_click",
        travel: "travel_story_click", play: "play_module_click", for_you: "for_you_click",
      };
      const pathParts = link.pathname.split("/").filter(Boolean);
      const metadata = source ? { module: source, ...(pathParts.length >= 2 ? { category: pathParts[0], slug: pathParts[pathParts.length - 1] } : {}) } : undefined;
      if (source && events[source]) trackHomepageEvent(events[source], metadata);
      if (source && link.pathname !== window.location.pathname) captureArticleSource(window.sessionStorage, source, link.pathname.split("/").filter(Boolean).pop() ?? "");
      if (source && link.href && !link.href.startsWith("#")) {
        try {
          const url = new URL(link.href, window.location.href);
          url.searchParams.set("sourceModule", source);
          link.href = url.toString();
        } catch { /* leave navigation unchanged */ }
      }
    }
    document.addEventListener("click", click, true);
    return () => { observer.disconnect(); document.removeEventListener("click", click, true); };
  }, []);
  return null;
}
