#!/usr/bin/env node
// Development-only diagnostic for the On Screen (TMDB) integration.
// Verifies the token → request → response → poster_path chain described in
// lib/on-screen.ts, without ever printing the token itself.
//
// Usage: node --env-file=.env.local scripts/verify-tmdb.mjs
// (or just `node scripts/verify-tmdb.mjs` if TMDB_ACCESS_TOKEN is already
// exported in your shell)

import fs from "node:fs";
import path from "node:path";

const token = process.env.TMDB_ACCESS_TOKEN;
const chart = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/on-screen.json"), "utf8"));

function normalizeTitle(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bseason\s+\d+\b/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReasonableMatch(target, candidate) {
  const a = normalizeTitle(target);
  const b = normalizeTitle(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

async function tmdb(pathname) {
  const res = await fetch(`https://api.themoviedb.org/3${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  console.log(`Token present: ${Boolean(token)}\n`);

  if (!token) {
    console.log("STOP: TMDB_ACCESS_TOKEN is not set. Add it to .env.local as:");
    console.log("  TMDB_ACCESS_TOKEN=your_token_here");
    console.log("Then re-run this script.");
    process.exitCode = 1;
    return;
  }

  // Step 1: prove the token itself authenticates, independent of any of our
  // own content — /configuration requires no params and no guessing.
  const auth = await tmdb("/configuration");
  console.log(`Auth check (/configuration): HTTP ${auth.status}`);
  if (auth.status === 401) {
    console.log("Result: TOKEN INVALID — TMDB rejected the Bearer token (401).");
    process.exitCode = 1;
    return;
  }
  if (!auth.ok) {
    console.log(`Result: unexpected response (${auth.status}) — cannot proceed.`);
    process.exitCode = 1;
    return;
  }
  console.log("Result: token authenticates correctly.\n");

  // Step 2: walk every chart item exactly the way lib/on-screen.ts does.
  const rows = [];
  for (const entry of chart.items) {
    const type = entry.mediaType === "movie" ? "movie" : "tv";
    let record = null;
    let via = "none";

    if (entry.tmdbId && entry.tmdbId > 0) {
      const res = await tmdb(`/${type}/${entry.tmdbId}?language=en-US`);
      if (res.status === 404) {
        rows.push({ section: entry.section, title: entry.title, tmdbId: entry.tmdbId, match: "404 (bad id)", poster: "no" });
        continue;
      }
      if (res.ok) {
        record = res.body;
        via = "exact id";
      }
    }

    if (!record) {
      const res = await tmdb(`/search/${type}?query=${encodeURIComponent(entry.title)}&include_adult=false&language=en-US&page=1`);
      const candidate = res.body?.results?.find((r) => isReasonableMatch(entry.title, r.title ?? r.name ?? ""));
      if (candidate) {
        record = candidate;
        via = "title search";
      }
    }

    // Mirror lib/on-screen.ts's priority: posterOverride > TMDB > fallback.
    const tmdbPoster = record?.poster_path ? true : false;
    const hasPoster = Boolean(entry.posterOverride) || tmdbPoster;
    const source = entry.posterOverride ? "override" : record ? via : "none";

    rows.push({
      section: entry.section,
      title: entry.title,
      tmdbId: record?.id ?? entry.tmdbId ?? "-",
      match: hasPoster ? `matched (${source})` : "needs-review",
      poster: hasPoster ? "yes" : "no",
    });
  }

  console.log("Section    | Title                            | TMDB ID | Match              | Poster");
  console.log("-----------|----------------------------------|---------|--------------------|----------");
  for (const r of rows) {
    console.log(
      `${String(r.section).padEnd(10)} | ${String(r.title).padEnd(32)} | ${String(r.tmdbId).padEnd(7)} | ${String(r.match).padEnd(18)} | ${r.poster}`,
    );
  }

  const matched = rows.filter((r) => r.poster === "yes").length;
  console.log(`\n${matched} / ${rows.length} items have a resolvable poster.`);
}

main();
