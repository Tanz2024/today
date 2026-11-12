import test from "node:test";
import assert from "node:assert/strict";
import loader from "../lib/cloudflare-image-loader.ts";
test("media assets use the Cloudflare transformation zone", () => { assert.equal(loader({ src: "https://media.brisastory.live/community/photo.jpg", width: 768, quality: 80 }), "https://brisastory.live/cdn-cgi/image/width=768,quality=80,format=auto/https://media.brisastory.live/community/photo.jpg"); });
test("provider CDN assets are served directly without Vercel optimization", () => { assert.equal(loader({ src: "https://images.pexels.com/photo.jpg?auto=compress&w=1600", width: 1024, quality: 80 }), "https://images.pexels.com/photo.jpg?auto=compress&w=1600"); });
test("local assets are served directly without Vercel optimization", () => { assert.equal(loader({ src: "/images/fallback-editorial.svg", width: 640 }), "/images/fallback-editorial.svg"); });
test("lookalike hosts are not treated as first-party media", () => { assert.equal(loader({ src: "https://not-media.brisastory.live/photo.jpg", width: 640 }), "https://not-media.brisastory.live/photo.jpg"); });
