const MEDIA_HOST = "media.brisastory.live";
const TRANSFORM_ZONE = "https://brisastory.live";
// Keep fill/thumbnail media requests reasonably small on mobile. Explicit
// width props still win for fixed-size images and known layout dimensions.
const DEFAULT_WIDTH = 1200;
const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1200, 1600];

/** Remove only whitespace/quote wrappers around the complete image source. */
export function sanitizeImageSrc(src: string): string {
  let sanitized = src.trim();
  for (let pass = 0; pass < 2; pass += 1) {
    const wrapped = sanitized.length >= 2 && ((sanitized.startsWith('"') && sanitized.endsWith('"')) || (sanitized.startsWith("'") && sanitized.endsWith("'")));
    const encodedWrapped = /^(%22)[\s\S]+(%22)$/i.test(sanitized) || /^(%27)[\s\S]+(%27)$/i.test(sanitized);
    if (!wrapped && !encodedWrapped) break;
    sanitized = sanitized.slice(wrapped ? 1 : 3, wrapped ? -1 : -3).trim();
  }
  return sanitized;
}

export function cloudflareMediaUrl(src: string, width?: number | string): string {
  src = sanitizeImageSrc(src);
  try {
    const url = new URL(src);
    if (url.hostname !== MEDIA_HOST) return src;

    const transformWidth = typeof width === "number" && width > 0 ? width : DEFAULT_WIDTH;
    return `${TRANSFORM_ZONE}/cdn-cgi/image/width=${transformWidth},quality=auto,format=auto/${src}`;
  } catch {
    return src;
  }
}

function maxResponsiveWidth(sizes?: string, width?: number | string): number {
  const explicit = typeof width === "number" && width > 0 ? width : Number(width);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const values = (sizes ?? "").match(/(\d+)px/g)?.map((value) => Number.parseInt(value, 10)) ?? [];
  if (values.length) return Math.max(...values);
  return sizes?.includes("100vw") ? 1600 : DEFAULT_WIDTH;
}

export function cloudflareMediaSrcSet(src: string, sizes?: string, width?: number | string): string | undefined {
  const sanitized = sanitizeImageSrc(src);
  try {
    if (new URL(sanitized).hostname !== MEDIA_HOST) return undefined;
  } catch {
    return undefined;
  }
  const maxWidth = maxResponsiveWidth(sizes, width);
  const variants = RESPONSIVE_WIDTHS.filter((variant) => variant <= maxWidth);
  if (!variants.length) variants.push(Math.max(1, Math.round(maxWidth)));
  return variants.map((variant) => `${cloudflareMediaUrl(sanitized, variant)} ${variant}w`).join(", ");
}
