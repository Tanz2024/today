export type AdSlotKey = "article-midpoint" | "category-boundary" | "homepage-boundary";

const slotIds: Record<AdSlotKey, string | undefined> = {
  "article-midpoint": process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT_ID?.trim() || undefined,
  "category-boundary": process.env.NEXT_PUBLIC_ADSENSE_CATEGORY_SLOT_ID?.trim() || undefined,
  "homepage-boundary": process.env.NEXT_PUBLIC_ADSENSE_HOMEPAGE_SLOT_ID?.trim() || undefined,
};

export function getAdSlotId(slot: AdSlotKey) {
  const value = slotIds[slot];
  return value && value !== "PASTE_SLOT_ID" ? value : undefined;
}
