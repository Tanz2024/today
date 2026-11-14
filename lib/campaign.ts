import { SITE_URL } from "./site-url.ts";
export type CampaignSharePlatform = "reddit" | "whatsapp" | "telegram" | "x" | "facebook" | "native" | "copy";

const PLATFORM_PARAMS: Record<CampaignSharePlatform, { source: string; medium: string }> = {
  reddit: { source: "reddit", medium: "social" },
  whatsapp: { source: "whatsapp", medium: "social" },
  telegram: { source: "telegram", medium: "social" },
  x: { source: "x", medium: "social" },
  facebook: { source: "facebook", medium: "social" },
  native: { source: "native_share", medium: "share" },
  copy: { source: "copy_link", medium: "share" },
};

export function normalizeUtmContent(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildCampaignUrl({ url, source, medium, campaign = "article_share", content }: {
  url: string;
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
}): string {
  const next = new URL(url, SITE_URL);
  next.searchParams.set("utm_source", source);
  next.searchParams.set("utm_medium", medium);
  next.searchParams.set("utm_campaign", campaign);
  if (content) next.searchParams.set("utm_content", normalizeUtmContent(content));
  return next.toString();
}

export function buildShareCampaignUrl(url: string, platform: CampaignSharePlatform, content?: string): string {
  const params = PLATFORM_PARAMS[platform];
  return buildCampaignUrl({ url, source: params.source, medium: params.medium, content });
}
