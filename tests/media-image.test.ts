import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cloudflareMediaSrcSet, cloudflareMediaUrl, sanitizeImageSrc } from "../lib/media-image.ts";

test("image sources are sanitized only when quotes wrap the complete source", () => {
  assert.equal(sanitizeImageSrc("/images/example.png"), "/images/example.png");
  assert.equal(sanitizeImageSrc('"/images/example.png"'), "/images/example.png");
  assert.equal(sanitizeImageSrc("'/images/example.png'"), "/images/example.png");
  assert.equal(sanitizeImageSrc("%22/images/example.png%22"), "/images/example.png");
  assert.equal(sanitizeImageSrc("%27/images/example.png%27"), "/images/example.png");
  assert.equal(sanitizeImageSrc(" https://example.com/image.jpg?text=%22hello%22 "), "https://example.com/image.jpg?text=%22hello%22");
});

test("Cloudflare media uses the first-party image transformation URL", () => {
  assert.equal(
    cloudflareMediaUrl("https://media.brisastory.live/community/photo.jpg", 768),
    "https://brisastory.live/cdn-cgi/image/width=768,quality=auto,format=auto/https://media.brisastory.live/community/photo.jpg",
  );
});

test("Cloudflare media uses a safe default width for fill images", () => {
  assert.equal(
    cloudflareMediaUrl("https://media.brisastory.live/community/photo.jpg"),
    "https://brisastory.live/cdn-cgi/image/width=1200,quality=auto,format=auto/https://media.brisastory.live/community/photo.jpg",
  );
});

test("local and external provider URLs remain direct", () => {
  assert.equal(cloudflareMediaUrl("/images/article/example.jpg", 768), "/images/article/example.jpg");
  assert.equal(cloudflareMediaUrl("https://images.pexels.com/photo.jpg", 768), "https://images.pexels.com/photo.jpg");
});

test("lookalike hosts are not transformed", () => {
  assert.equal(cloudflareMediaUrl("https://not-media.brisastory.live/photo.jpg", 768), "https://not-media.brisastory.live/photo.jpg");
});

test("Cloudflare media generates bounded responsive variants", () => {
  const srcSet = cloudflareMediaSrcSet("https://media.brisastory.live/community/photo.jpg", "(max-width: 700px) 100vw, 700px");
  assert.ok(srcSet);
  assert.match(srcSet, /width=640/);
  assert.doesNotMatch(srcSet, /width=768/);
});

test("responsive variants are omitted for local and external images", () => {
  assert.equal(cloudflareMediaSrcSet("/images/article/example.jpg", "100vw"), undefined);
  assert.equal(cloudflareMediaSrcSet("https://images.pexels.com/photo.jpg", "100vw"), undefined);
});

test("MediaImage keeps normal image sources unchanged", () => {
  assert.equal(cloudflareMediaUrl("/images/article/example.jpg", 768), "/images/article/example.jpg");
});

test("MediaImage transforms R2 image sources", () => {
  assert.equal(
    cloudflareMediaUrl("https://media.brisastory.live/community/photo.jpg", 640),
    "https://brisastory.live/cdn-cgi/image/width=640,quality=auto,format=auto/https://media.brisastory.live/community/photo.jpg",
  );
});

test("quoted Cloudflare media is sanitized before transformation", () => {
  assert.equal(
    cloudflareMediaUrl('"https://media.brisastory.live/test.webp"'),
    "https://brisastory.live/cdn-cgi/image/width=1200,quality=auto,format=auto/https://media.brisastory.live/test.webp",
  );
});

test("MediaImage uses the local fallback after an image failure", () => {
  const source = readFileSync(new URL("../components/ui/MediaImage.tsx", import.meta.url), "utf8");
  assert.match(source, /FALLBACK_IMAGE\s*=\s*["']\/images\/fallback-editorial\.svg["']/);
  assert.match(source, /currentSrc\s*!==\s*FALLBACK_IMAGE/);
});
