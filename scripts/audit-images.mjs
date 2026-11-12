#!/usr/bin/env node
// Development utility: audits every published article's image for the
// problems described in the BrisaStory image system review — duplicate
// images reused across unrelated articles, missing image/imageAlt, and
// broken (unreachable) image URLs.
//
// Usage: node scripts/audit-images.mjs [--check-urls]
//   --check-urls   also HEAD-request every unique remote image (slower,
//                   requires network access) to catch dead links like the
//                   two this audit originally found.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { FALLBACK_IMAGE } from "../lib/images.ts";

const CONTENT_DIR = path.join(process.cwd(), "content");
const checkUrls = process.argv.includes("--check-urls");

function loadArticles() {
  const categories = fs.readdirSync(CONTENT_DIR).filter((d) => fs.statSync(path.join(CONTENT_DIR, d)).isDirectory());
  const articles = [];
  for (const cat of categories) {
    const dir = path.join(CONTENT_DIR, cat);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data } = matter(raw);
      if (data.status === "draft") continue;
      articles.push({ slug: `${cat}/${file.replace(/\.mdx$/, "")}`, title: data.title, ...data });
    }
  }
  return articles;
}

async function urlIsBroken(url) {
  if (!url.startsWith("http")) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return !res.ok;
  } catch {
    return true;
  }
}

async function main() {
  const articles = loadArticles();
  let issues = 0;

  const missingImage = articles.filter((a) => !a.image);
  const missingAlt = articles.filter((a) => a.image && !a.imageAlt);
  const flagged = articles.filter((a) => a.needsImageReview);
  const fallback = articles.filter((a) => a.imageSourceType === "fallback");

  const byImage = new Map();
  for (const a of articles) {
    if (!a.image || a.image === FALLBACK_IMAGE) continue;
    if (!byImage.has(a.image)) byImage.set(a.image, []);
    byImage.get(a.image).push(a);
  }
  const duplicates = [...byImage.entries()].filter(([, list]) => list.length > 1);

  console.log(`Audited ${articles.length} published articles.\n`);

  if (duplicates.length) {
    console.log("=== DUPLICATE IMAGE ===\n");
    for (const [img, list] of duplicates) {
      console.log(img);
      console.log("used by:");
      for (const a of list) console.log(`  - ${a.title} (${a.slug})`);
      console.log();
      issues += list.length;
    }
  } else {
    console.log("No duplicate images.\n");
  }

  if (missingImage.length) {
    console.log("=== MISSING IMAGE ===\n");
    missingImage.forEach((a) => console.log(`  - ${a.title} (${a.slug})`));
    console.log();
    issues += missingImage.length;
  }

  if (missingAlt.length) {
    console.log("=== MISSING IMAGE ALT ===\n");
    missingAlt.forEach((a) => console.log(`  - ${a.title} (${a.slug})`));
    console.log();
    issues += missingAlt.length;
  }

  if (fallback.length) {
    console.log("=== USING NEUTRAL FALLBACK (needs a real image sourced) ===\n");
    fallback.forEach((a) => console.log(`  - ${a.title} (${a.slug})`));
    console.log();
  }

  if (flagged.length) {
    console.log(`=== FLAGGED FOR EDITORIAL REVIEW: ${flagged.length} article(s) ===`);
    console.log("(see content/image-review.json for concepts/keywords)\n");
    issues += flagged.length;
  }

  if (checkUrls) {
    console.log("Checking remote image URLs (HEAD requests)...\n");
    const unique = [...byImage.keys()];
    const results = await Promise.all(unique.map(async (url) => [url, await urlIsBroken(url)]));
    const broken = results.filter(([, isBroken]) => isBroken);
    if (broken.length) {
      console.log("=== BROKEN IMAGE PATH ===\n");
      for (const [url] of broken) {
        console.log(url);
        console.log("used by:");
        for (const a of byImage.get(url)) console.log(`  - ${a.title} (${a.slug})`);
        console.log();
        issues += byImage.get(url).length;
      }
    } else {
      console.log("No broken remote image URLs.\n");
    }
  }

  console.log(`Total flagged references: ${issues}`);
  if (issues > 0) process.exitCode = 1;
}

main();
