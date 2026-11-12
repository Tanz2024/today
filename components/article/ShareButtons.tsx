"use client";

import { useState } from "react";
import {
  Check,
  Link as LinkIcon,
  WhatsappLogo,
  XLogo,
  FacebookLogo,
} from "@phosphor-icons/react";
import { buildShareCampaignUrl } from "@/lib/campaign";
import { trackArticleShare } from "@/lib/homepage-analytics";

export default function ShareButtons({
  url,
  title,
  slug,
  category,
}: {
  url: string;
  title: string;
  slug: string;
  category: string;
}) {
  const [copied, setCopied] =
    useState(false);

  const track = (platform: "copy" | "native" | "whatsapp" | "x" | "facebook" | "reddit" | "telegram") => {
    trackArticleShare({ slug, category, platform, utm_source: platform === "native" ? "native_share" : platform === "copy" ? "copy_link" : platform, utm_medium: platform === "native" || platform === "copy" ? "share" : "social", utm_campaign: "article_share", utm_content: slug });
  };

  function legacyCopy(value: string): boolean {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus(); textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch { return false; }
  }

  async function copyLink() {
    const trackedUrl = buildShareCampaignUrl(url, "copy", slug);
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(trackedUrl);
      else if (!legacyCopy(trackedUrl)) throw new Error("copy unavailable");

      setCopied(true);
      track("copy");

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
      window.prompt("Copy this link:", trackedUrl);
    }
  }

  const tracked = (platform: "whatsapp" | "x" | "facebook" | "reddit" | "telegram") => buildShareCampaignUrl(url, platform, slug);
  const encodedTitle =
    encodeURIComponent(title);

  async function shareNative() {
    const trackedUrl = buildShareCampaignUrl(url, "native", slug);
    try {
      if (navigator.share) await navigator.share({ title, text: title, url: trackedUrl });
      else { await copyLink(); return; }
      track("native");
    } catch {
      // The reader may close the native share sheet; no error is needed.
    }
  }

  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodeURIComponent(tracked("whatsapp"))}`,
      icon: WhatsappLogo,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent(tracked("x"))}`,
      icon: XLogo,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tracked("facebook"))}`,
      icon: FacebookLogo,
    },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${encodeURIComponent(tracked("reddit"))}&title=${encodedTitle}`, icon: LinkIcon },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(tracked("telegram"))}&text=${encodedTitle}`, icon: LinkIcon },
  ] as const;

  return (
    <div>
      <p
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.13em]
          text-muted
        "
      >
        Share this story
      </p>

      <div
        className="
          mt-4
          flex flex-wrap
          items-center
          gap-x-5 gap-y-3
        "
      >
        <button
          type="button"
          onClick={copyLink}
          className="
            group
            inline-flex min-h-[44px]
            items-center gap-2
            text-[14px]
            font-medium
            text-near-black
            transition-colors
            duration-150
            hover:text-electric
          "
        >
          {copied ? (
            <Check
              size={16}
              weight="bold"
              aria-hidden="true"
            />
          ) : (
            <LinkIcon
              size={16}
              weight="regular"
              aria-hidden="true"
            />
          )}

          {copied
            ? "Copied"
            : "Copy link"}
        </button>

        {links.map(
          ({
            label,
            href,
            icon: Icon,
          }) => (
            <a
              key={label}
              href={href}
              onClick={() => track(label.toLowerCase() as "whatsapp" | "x" | "facebook" | "reddit" | "telegram")}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group
                inline-flex min-h-[44px]
                items-center gap-2
                text-[14px]
                font-medium
                text-near-black
                transition-colors
                duration-150
                hover:text-electric
              "
            >
              <Icon
                size={16}
                weight="regular"
                aria-hidden="true"
              />

              {label}
            </a>
          ),
        )}
      </div>
      <button type="button" onClick={shareNative} className="mt-3 inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-near-black hover:text-electric">Share via device</button>
    </div>
  );
}
