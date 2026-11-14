import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const isStaging = process.env.NEXT_PUBLIC_DEPLOY_ENV === "staging";
// Google ad + consent hosts (AdSense, ad quality, Funding Choices / Privacy &
// messaging). Listed explicitly; no wildcards beyond Google Analytics' own.
const GOOGLE_AD_SCRIPT = "https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com";
const GOOGLE_AD_CONNECT = "https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://fundingchoicesmessages.google.com";
const GOOGLE_AD_FRAME = "https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://ep2.adtrafficquality.google https://www.google.com https://fundingchoicesmessages.google.com";

// In-browser AI models (AI Word Detective, AI Draw & Guess) via
// @huggingface/transformers. Only those two routes get these sources:
// - model files from huggingface.co, which redirects to its file CDNs;
// - the ONNX Runtime WASM build that transformers.js loads from jsDelivr,
//   pinned to the installed onnxruntime-web version (update on upgrade);
// - blob: scripts/workers (transformers.js wraps the WASM factory in a blob
//   URL outside Chrome) and 'wasm-unsafe-eval', which WebAssembly
//   compilation requires under CSP. 'unsafe-eval' is NOT granted.
const ORT_WEB_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";
// Hugging Face file CDNs: LFS and Xet storage (e.g. us.aws.cdn.hf.co, cas-bridge.xethub.hf.co).
const HF_MODEL_HOSTS = "https://huggingface.co https://cdn-lfs.huggingface.co https://*.hf.co";

// On-device OCR (tesseract.js): worker, WASM core and English model files,
// pinned to the installed versions (update on upgrade).
const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/ https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0/ https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/";

// Citation lookup in the Writing Studio (opt-in, search text only).
const CROSSREF_API = "https://api.crossref.org";

function buildCsp({ aiModels = false, ocr = false, crossref = false } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}${aiModels || ocr ? " 'wasm-unsafe-eval' blob:" : ""}${aiModels ? ` ${ORT_WEB_CDN}` : ""}${ocr ? ` ${TESSERACT_CDN}` : ""} https://cloud.umami.is https://challenges.cloudflare.com https://www.googletagmanager.com https://static.cloudflareinsights.com https://s3.tradingview.com ${GOOGLE_AD_SCRIPT}`,
    `connect-src 'self' https://cloud.umami.is https://gateway.umami.is https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://stream.mux.com https://challenges.cloudflare.com https://static.cloudflareinsights.com ${GOOGLE_AD_CONNECT}${aiModels ? ` ${HF_MODEL_HOSTS} ${ORT_WEB_CDN}` : ""}${ocr ? ` ${TESSERACT_CDN}` : ""}${crossref ? ` ${CROSSREF_API}` : ""}`,
    ...(aiModels || ocr ? ["worker-src 'self' blob:"] : []),
    "media-src 'self' https://stream.mux.com https:",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `frame-src https://www.tradingview-widget.com https://s.tradingview.com https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com ${GOOGLE_AD_FRAME}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
}
// Routes that load in-browser models, and which kind. Each gets exactly one CSP.
const AI_MODEL_ROUTES: { source: string; aiModels?: boolean; ocr?: boolean; crossref?: boolean }[] = [
  // On-device AI workspaces (lib/local-llm worker + existing image/OCR models).
  { source: "/tools/ai-writing-studio", aiModels: true, crossref: true },
  { source: "/tools/ai-resume-assistant", aiModels: true },
  { source: "/tools/ai-image-document-studio", aiModels: true, ocr: true },
  { source: "/tools/ai-study-assistant", aiModels: true, ocr: true },
  { source: "/play/word-detective", aiModels: true },
  { source: "/play/quick-draw", aiModels: true },
  { source: "/tools/ai-background-remover", aiModels: true },
  { source: "/tools/ai-speech-to-text", aiModels: true },
  { source: "/tools/ai-image-to-text", ocr: true },
  { source: "/tools/ai-pdf-assistant", ocr: true },
];
// Module Web Workers (lib/local-llm/llm.worker.ts) are governed by the CSP of
// their own script response, not the page's. Bundled scripts therefore carry
// the model-loading policy; a CSP on a script response has no effect when the
// file is loaded with <script>, so this only matters for workers.
const WORKER_SCRIPT_ROUTES = ["/_next/static/:path*", "/assets/:path*"];
const AI_MODEL_EXCLUDE = [...AI_MODEL_ROUTES.map((route) => route.source.slice(1)), "_next/static", "assets/"].join("|");
// Only the speech tool may ask for the microphone (and only from this origin).
const MIC_ROUTE = "/tools/ai-speech-to-text";
const permissionsPolicy = (mic: boolean) => `camera=(), microphone=(${mic ? "self" : ""}), geolocation=(), payment=(), usb=()`;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Retired hubs with a genuinely equivalent AI replacement (308).
      // Everything else that was retired answers 410 Gone from proxy.ts.
      { source: "/explore", destination: "/ai", permanent: true },
      { source: "/trending", destination: "/news", permanent: true },
      { source: "/play/this-or-that", destination: "/play", permanent: true },
    ];
  },
  async headers() {
    // Exactly one CSP header per route: browsers enforce every CSP they
    // receive, so the AI-model routes must not also get the default one.
    return [
      { source: `/((?!${AI_MODEL_EXCLUDE}).*)`, headers: [{ key: "Content-Security-Policy", value: buildCsp() }] },
      ...AI_MODEL_ROUTES.map(({ source, aiModels, ocr, crossref }) => ({ source, headers: [{ key: "Content-Security-Policy", value: buildCsp({ aiModels, ocr, crossref }) }] })),
      ...WORKER_SCRIPT_ROUTES.map((source) => ({ source, headers: [{ key: "Content-Security-Policy", value: buildCsp({ aiModels: true, ocr: true }) }] })),
      { source: `/((?!${MIC_ROUTE.slice(1)}).*)`, headers: [{ key: "Permissions-Policy", value: permissionsPolicy(false) }] },
      { source: MIC_ROUTE, headers: [{ key: "Permissions-Policy", value: permissionsPolicy(true) }] },
      { source: "/(.*)", headers: [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      ...(isStaging ? [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] : []),
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
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
