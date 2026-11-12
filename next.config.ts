import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://cloud.umami.is https://challenges.cloudflare.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://static.cloudflareinsights.com https://ep2.adtrafficquality.google`,
  "connect-src 'self' https://cloud.umami.is https://gateway.umami.is https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://stream.mux.com https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://static.cloudflareinsights.com",
  "media-src 'self' https://stream.mux.com https:",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/meaning", destination: "/culture", permanent: true },
      { source: "/meaning/:slug", destination: "/culture/:slug", permanent: true },
      { source: "/food", destination: "/travel", permanent: true },
      // This or That was replaced by the Play games; keep old and shared links working.
      { source: "/play/this-or-that", destination: "/play", permanent: true },
      { source: "/relationships/why-everyone-is-talking-about-the-scandal", destination: "/culture/why-everyone-is-talking-about-the-scandal", permanent: true },
      { source: "/food/:slug", destination: "/travel/:slug", permanent: true },
      { source: "/social/food-drink-for-the-group-chat", destination: "/travel/food-drink-for-the-group-chat", permanent: true },
      { source: "/social", destination: "/culture", permanent: true },
      // Hidden desk landing pages go to the public desk that lists their stories
      // (lib/categories.ts PUBLIC_DESK_FOR_HIDDEN). Article URLs are unchanged.
      { source: "/entertainment", destination: "/culture", permanent: true },
      { source: "/self-care", destination: "/relationships", permanent: true },
      { source: "/social/culture-lifestyle-is-a-vibe", destination: "/culture/culture-lifestyle-is-a-vibe", permanent: true },
      { source: "/social/social-media-etiquette", destination: "/culture/social-media-etiquette", permanent: true },
      { source: "/social/how-to-stop-doomscrolling", destination: "/self-care/how-to-stop-doomscrolling", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }];
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudflare-image-loader.ts",
    // Never send images through Next/Vercel's /_next/image endpoint. Images
    // are already direct provider URLs, or are transformed by the custom
    // Cloudflare loader when that loader is used by an image component.
    unoptimized: true,
    // AVIF first (much smaller photos on phones), WebP as the fallback.
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "media.brisastory.live" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/PokeAPI/sprites/**" },
    ],
  },
};

export default nextConfig;
