"use client";

import { useEffect, useState } from "react";
import { BookmarkSimple, Check, Eye, ShareNetwork } from "@phosphor-icons/react";
import { buildShareCampaignUrl } from "@/lib/campaign";
import { trackArticleShare } from "@/lib/homepage-analytics";

// Quiet, inline Save / reads / Share row for the article intro — mobile only.
// The sticky bottom reading bar (MobileReaderTools) repeats Save/reads
// further down for convenience while scrolling; this is the calm,
// non-sticky set that belongs in the editorial header itself. Every item
// here is either a real action (Save, Share) or a plain stat (reads) — no
// control does two unrelated things at once.
export default function ArticleIntroUtilities({ slug, category, title, reads }: { slug: string; category: string; title: string; reads?: number | null }) {
  const [saved, setSaved] = useState(false);
  const [liveReads, setLiveReads] = useState(reads);

  useEffect(() => {
    queueMicrotask(() => setSaved(localStorage.getItem(`brisastory:saved:${slug}`) === "1"));
  }, [slug]);

  useEffect(() => {
    let active = true;
    fetch(`/api/read-time/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && typeof data?.stats?.sampleCount === "number") setLiveReads(data.stats.sampleCount); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [slug]);

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    if (next) localStorage.setItem(`brisastory:saved:${slug}`, "1");
    else localStorage.removeItem(`brisastory:saved:${slug}`);
    window.dispatchEvent(new CustomEvent("brisastory:save-changed", { detail: { slug, saved: next } }));
  }

  async function share() {
    const canonicalUrl = `${window.location.origin}/${category}/${slug}`;
    if (navigator.share) {
      await navigator.share({ title, url: buildShareCampaignUrl(canonicalUrl, "native", slug) }).then(() => trackArticleShare({ slug, category, platform: "native", utm_source: "native_share", utm_medium: "share", utm_campaign: "article_share", utm_content: slug })).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(buildShareCampaignUrl(canonicalUrl, "copy", slug));
      trackArticleShare({ slug, category, platform: "copy", utm_source: "copy_link", utm_medium: "share", utm_campaign: "article_share", utm_content: slug });
    }
  }

  return (
    <div id="article-top-controls" className="mt-6 flex items-center gap-6 sm:gap-7">
      <button
        type="button"
        onClick={toggleSaved}
        aria-pressed={saved}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-near-black"
      >
        {saved ? <Check size={16} weight="bold" aria-hidden /> : <BookmarkSimple size={16} aria-hidden />}
        <span>{saved ? "Saved" : "Save"}</span>
      </button>

      {typeof liveReads === "number" && (
        <span
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-muted"
          title={`${liveReads.toLocaleString()} article reads`}
          aria-label={`${liveReads.toLocaleString()} article reads`}
        >
          <Eye size={16} aria-hidden />
          {liveReads.toLocaleString()}
        </span>
      )}

      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-near-black"
      >
        <ShareNetwork size={16} aria-hidden />
        <span>Share</span>
      </button>
    </div>
  );
}
