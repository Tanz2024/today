// Single, consistent image-resolution strategy for article imagery.
//
// Every surface that renders an article photo (ArticleCard, Hero, category
// pages, related reading, search results, franchise/WTF sections) reads
// `article.image` / `article.imageAlt`, and every one of those `Article`
// objects is produced by lib/articles.ts. Resolving images there — once —
// means no component needs its own fallback logic.
//
// This only ever substitutes a neutral local graphic, never another stock
// photo, and only when an article genuinely has no working image path. A
// mismatched-but-loading photo is left alone and instead flagged via
// `needsImageReview` (see content/image-review.json) for a human to replace —
// swapping every flagged image to this placeholder would be a much bigger
// visible change than "fix the image system" calls for.

export const FALLBACK_IMAGE = "/images/fallback-editorial.svg";
export const FALLBACK_IMAGE_ALT = "BrisaStory — image pending editorial review";

export function resolveImage(image: string | undefined, imageAlt: string | undefined) {
  if (image) return { image, imageAlt: imageAlt ?? "" };
  return { image: FALLBACK_IMAGE, imageAlt: FALLBACK_IMAGE_ALT };
}
