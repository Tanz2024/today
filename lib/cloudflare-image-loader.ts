type LoaderProps = { src: string; width: number; quality?: number };
const CLOUDFLARE_MEDIA_HOST = "media.brisastory.live";
const TRANSFORM_ZONE = "https://brisastory.live";
function isCloudflareMediaSource(src: string): boolean { try { return new URL(src).hostname === CLOUDFLARE_MEDIA_HOST; } catch { return false; } }
export default function cloudflareImageLoader({ src, width, quality = 80 }: LoaderProps): string {
  if (isCloudflareMediaSource(src)) return `${TRANSFORM_ZONE}/cdn-cgi/image/width=${width},quality=${quality},format=auto/${src}`;
  // Local assets and third-party CDN URLs are already directly fetchable by
  // the browser. Their existing provider URL/query parameters are preserved;
  // no Vercel optimizer URL is introduced for them.
  return src;
}
