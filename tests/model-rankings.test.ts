import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  accessFromArenaLicense,
  accessFromEpoch,
  aggregateBenchmark,
  aggregateUsage,
  arenaAliasKey,
  blendedPrice,
  buildApiIdIndex,
  buildSnapshot,
  buildVersionIndex,
  csvToObjects,
  dateStamp,
  dedupeArena,
  formatValue,
  matchCandidate,
  normaliseApiId,
  normaliseModelName,
  openRouterPriceCandidates,
  parseCsv,
  parseEciRows,
  pickConsistentPrice,
  priceChartRows,
  rankBy,
  rankWithin,
  releasedWithin,
  validateSnapshot,
  valueFrontier,
  type ArenaRow,
  type ModelBenchmarksSnapshot,
} from "../lib/model-rankings.ts";

/* ── Fixtures (shaped like the real source files) ─────────────────────── */

const ECI_CSV = [
  "Model,Display name,eci,eci_ci_low,eci_ci_high,date,Organization,Country (of organization),Model accessibility,Accessibility group,model_versions",
  "Claude Opus 5.5,Claude Opus 5.5,168.54,165.63,171.83,2026-09-22,Anthropic,United States of America,API access,Closed weights,",
  "Kimi K3.1 Pro,Kimi K3.1 Pro,161.37,158.99,164.0,2026-10-23,Moonshot,China,Open weights (restricted use),Open weights,",
  "Gemini 4 Argon,Gemini 4 Argon,166.48,163.77,169.46,2026-09-30,Google DeepMind,United States of America,Limited access,Other,",
  "Gemini 3.1 Pro,Gemini 3.1 Pro,156.18,154.39,158.14,2026-02-19,Google DeepMind,United States of America,API access,Closed weights,",
  "DeepSeek V4.1 Flash,DeepSeek V4.1 Flash,156.7,154.79,158.78,2026-09-09,DeepSeek,China,Open weights (unrestricted),Open weights,",
  "DeepSeek V4.1 Flash 1017,DeepSeek V4.1 Flash 1017,159.41,157.01,162.0,2026-10-17,DeepSeek,China,Open weights (unrestricted),Open weights,",
  "Qwen 3.8 Max,Qwen 3.8 Max,157.59,155.42,159.96,2026-08-02,Alibaba,China,API access,Closed weights,",
  "Qwen3.8 Max (0902),Qwen3.8 Max (0902),155.97,153.9,158.1,2026-09-02,Alibaba,China,API access,Closed weights,",
  "\"StarCoder 2\",StarCoder 2,110.2,105.1,115.3,2024-02-28,\"Nvidia,BigCode\",United States of America,Open weights (unrestricted),Open weights,",
  "Gemini 2.5 Pro,Gemini 2.5 Pro,140.1,139,141,2025-03-25,Google DeepMind,United States of America,API access,Closed weights,",
  "Gemini 2.5 Pro (Jun 2025),Gemini 2.5 Pro (Jun 2025),141.1,140,142,2025-06-05,Google DeepMind,United States of America,API access,Closed weights,",
].join("\n");

const METADATA_CSV = [
  "model_version,model_group,date,display_name,organization,country,accessibility,training_compute_flop",
  ",,,,,,,",
  "claude-opus-5-5_max,Claude Opus 5.5,2026-09-22,Claude Opus 5.5 (max),Anthropic,United States of America,API access,",
  "claude-opus-5-5_high,Claude Opus 5.5,2026-09-22,Claude Opus 5.5 (high),Anthropic,United States of America,API access,",
  "claude-opus-5-5-fallback_max,Claude Opus 5.5,2026-09-22,\"Claude Opus 5.5 (with fallback, max)\",Anthropic,United States of America,API access,",
  "kimi-k3.1-pro_max,Kimi K3.1 Pro,2026-10-23,,Moonshot,China,Open weights (restricted use),",
  "gemini-3.1-pro-preview_high,Gemini 3.1 Pro,2026-02-19,,Google DeepMind,United States of America,API access,",
  "gemini-3.1-pro-preview,Gemini 3.1 Pro,2026-02-19,,Google DeepMind,United States of America,API access,",
  "old-model,Old Model,2023-01-01,,Someone,,,",
].join("\n");

const GPQA_CSV = [
  "Model version,mean_score,Best score (across scorers),Release date,Organization,Country,Training compute (FLOP),Training compute notes,stderr,Log viewer,Logs,Started at,id",
  "claude-opus-5-5_high,0.90,0.91,2026-09-22,Anthropic,United States of America,,,0.01,,,2026-09-30T00:00:00Z,a",
  "claude-opus-5-5_max,0.93,0.94,2026-09-22,Anthropic,United States of America,,,0.01,,,2026-09-30T00:00:00Z,b",
  "claude-opus-5-5-fallback_max,0.99,0.99,2026-09-22,Anthropic,United States of America,,,0.01,,,2026-09-30T00:00:00Z,c",
  "kimi-k3.1-pro_max,0.88,0.88,2026-10-23,Moonshot,China,2e25,\"Notes, with a comma\nand a newline\",0.02,,,2026-11-01T00:00:00Z,d",
  "unknown-version,0.99,0.99,2026-01-01,Nobody,,,,,,,2026-01-01T00:00:00Z,e",
].join("\n");

const arenaRow = (model_name: string, organization: string, license: string, rating: number, category = "overall"): ArenaRow => ({
  model_name, organization, license, rating, rating_lower: rating - 5, rating_upper: rating + 5, vote_count: BigInt(1000), category, leaderboard_publish_date: "2026-11-11",
});

const ARENA_ROWS: ArenaRow[] = [
  arenaRow("Claude Opus 5.5 (High)", "anthropic", "Proprietary", 1507),
  arenaRow("Claude Opus 5.5", "anthropic", "Proprietary", 1500),
  arenaRow("Kimi K3.1 Pro (Max)", "moonshot", "Kimi K3.1 Pro License", 1485),
  arenaRow("Gemini 3.1 Pro Preview", "google", "Proprietary", 1487),
  arenaRow("DeepSeek-V4.1-Flash-20260910 (Max)", "deepseek", "MIT", 1475),
  arenaRow("Qwen3.8-Max", "alibaba", "Proprietary", 1484),
  arenaRow("Mystery Model", "acme", "Other", 1400),
  arenaRow("Claude Opus 5.5 (High)", "anthropic", "Proprietary", 1600, "coding"),
];

const OPENROUTER = [
  { id: "anthropic/claude-opus-5.5", name: "Anthropic: Claude Opus 5.5", pricing: { prompt: "0.000004", completion: "0.00002" } },
  { id: "anthropic/claude-opus-5.5:batch", name: "Anthropic: Claude Opus 5.5 (batch)", pricing: { prompt: "0.000002", completion: "0.00001" } },
  { id: "moonshotai/kimi-k3.1-pro", name: "MoonshotAI: Kimi K3.1 Pro", pricing: { prompt: "0.000002", completion: "0.00001" } },
  { id: "google/gemini-3.1-pro-preview", name: "Google: Gemini 3.1 Pro Preview", pricing: { prompt: "0.000002", completion: "0.000012" } },
  { id: "deepseek/deepseek-v4.1-flash-1017", name: "DeepSeek: DeepSeek V4.1 Flash 1017", pricing: { prompt: "0.000000038", completion: "0.0000005" } },
  { id: "openrouter/free-thing", name: "Free thing", pricing: { prompt: "0", completion: "0" } },
];

const SOURCES: ModelBenchmarksSnapshot["sources"] = {
  epoch: { asOf: "2026-11-14", fetchedAt: "2026-11-14T10:00:00Z", url: "https://epoch.ai/data/benchmark_data.zip", pageUrl: "https://epoch.ai/benchmarks", citation: "Epoch AI", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  lmarena: { asOf: "2026-11-11", fetchedAt: "2026-11-14T10:00:00Z", url: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset", config: "text_style_control", category: "overall", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  openrouter: { asOf: "2026-11-14", url: "https://openrouter.ai/api/v1/models" },
};

const buildFixture = () => buildSnapshot({
  eciCsv: ECI_CSV,
  metadataCsv: METADATA_CSV,
  benchmarkCsv: { "gpqa_diamond.csv": GPQA_CSV },
  arenaRows: ARENA_ROWS,
  openRouterModels: OPENROUTER,
  sources: SOURCES,
  generatedAt: "2026-11-14T10:00:00Z",
});

/* ── CSV ──────────────────────────────────────────────────────────────── */

test("parseCsv handles quoted commas, doubled quotes, embedded newlines, CRLF and a BOM", () => {
  const rows = parseCsv("﻿a,b,c\r\n1,\"x, y\",\"say \"\"hi\"\"\"\r\n2,\"line\nbreak\",\r\n\r\n");
  assert.deepEqual(rows, [["a", "b", "c"], ["1", "x, y", 'say "hi"'], ["2", "line\nbreak", ""]]);
});

test("csvToObjects keys rows by header and trims cells", () => {
  const rows = csvToObjects("Model, eci \n Foo , 12.5 \n");
  assert.deepEqual(rows, [{ Model: "Foo", eci: "12.5" }]);
});

/* ── Names ────────────────────────────────────────────────────────────── */

test("normaliseModelName aligns names across Epoch, LMArena and OpenRouter", () => {
  assert.equal(normaliseModelName("Qwen3.8-Max"), normaliseModelName("Qwen 3.8 Max"));
  assert.equal(normaliseModelName("Anthropic: Claude Opus 5.5"), normaliseModelName("Claude Opus 5.5 (High)"));
  assert.equal(normaliseModelName("DeepSeek-V4.1-Flash-20260910 (Max)"), "deepseek v 4.1 flash");
  assert.equal(normaliseModelName("Qwen3.8 Max (0902)"), "qwen 3.8 max 0902");
  assert.notEqual(normaliseModelName("GPT-5.5 Pro"), normaliseModelName("GPT-5.5"));
  assert.equal(dateStamp("DeepSeek-V4-Pro (High, 20260813)"), "0813");
  assert.equal(dateStamp("Claude Opus 5.5 (High)"), null);
});

test("normaliseApiId drops effort suffixes and treats dots as dashes", () => {
  assert.equal(normaliseApiId("gemini-3.1-pro-preview_high"), "gemini-3-1-pro-preview");
  assert.equal(normaliseApiId("grok-4.20"), normaliseApiId("grok-4-20"));
});

/* ── Open / closed ────────────────────────────────────────────────────── */

test("access labels follow each source's own wording", () => {
  assert.equal(accessFromEpoch("Open weights (non-commercial)", "Open weights"), "open");
  assert.equal(accessFromEpoch("API access", "Closed weights"), "closed");
  assert.equal(accessFromEpoch("Unreleased", "Closed weights"), "closed");
  assert.equal(accessFromEpoch("Limited access", "Other"), "other");
  assert.equal(accessFromEpoch("Unknown"), "other");
  assert.equal(accessFromEpoch("API access"), "closed");
  assert.equal(accessFromArenaLicense("Proprietary"), "closed");
  assert.equal(accessFromArenaLicense("MIT"), "open");
  assert.equal(accessFromArenaLicense("Other"), "other");
  assert.equal(accessFromArenaLicense(""), "other");
});

/* ── Epoch parsing ────────────────────────────────────────────────────── */

test("parseEciRows keeps distinct dated entries, sorts by score and reads quoted organisations", () => {
  const rows = parseEciRows(csvToObjects(ECI_CSV));
  assert.equal(rows.length, 11);
  assert.equal(rows[0].name, "Claude Opus 5.5");
  assert.equal(rows.find((row) => row.key === "StarCoder 2")?.organization, "Nvidia,BigCode");
  assert.ok(rows.some((row) => row.id === "gemini-2-5-pro") && rows.some((row) => row.id === "gemini-2-5-pro-jun-2025"));
  const kimi = rows.find((row) => row.key === "Kimi K3.1 Pro")!;
  assert.deepEqual(kimi.eci, { score: 161.37, low: 158.99, high: 164 });
  assert.equal(kimi.access, "open");
});

test("aggregateBenchmark keeps each model's best run, skips fallback and unknown versions", () => {
  const entries = aggregateBenchmark(csvToObjects(GPQA_CSV), buildVersionIndex(csvToObjects(METADATA_CSV)));
  assert.deepEqual(entries.map((entry) => [entry.name, entry.score, entry.version]), [["Claude Opus 5.5", 0.94, "claude-opus-5-5_max"], ["Kimi K3.1 Pro", 0.88, "kimi-k3.1-pro_max"]]);
  assert.equal(entries[1].access, "open");
});

/* ── LMArena ──────────────────────────────────────────────────────────── */

test("dedupeArena keeps the best variant per model, one category only, separate dated snapshots", () => {
  const entries = dedupeArena([...ARENA_ROWS, arenaRow("DeepSeek-V4.1-Flash-20261017", "deepseek", "MIT", 1470)]);
  const opus = entries.filter((entry) => entry.name === "Claude Opus 5.5");
  assert.equal(opus.length, 1);
  assert.equal(opus[0].entry, "Claude Opus 5.5 (High)");
  assert.equal(opus[0].score, 1507);
  assert.equal(opus[0].votes, 1000);
  assert.equal(entries.filter((entry) => entry.name === "DeepSeek-V4.1-Flash").length, 2);
  assert.equal(entries.find((entry) => entry.name === "Kimi K3.1 Pro")?.access, "open");
  assert.equal(arenaAliasKey({ name: "DeepSeek-V4.1-Flash", entry: "DeepSeek-V4.1-Flash-20260910 (Max)" }), "DeepSeek-V4.1-Flash @0910");
});

/* ── Matching ─────────────────────────────────────────────────────────── */

test("matchCandidate: exact normalised name with agreeing makers", () => {
  const canonical = parseEciRows(csvToObjects(ECI_CSV));
  assert.equal(matchCandidate({ key: "x", name: "Claude Opus 5.5", organization: "anthropic" }, canonical)?.canonicalId, "claude-opus-5-5");
  assert.equal(matchCandidate({ key: "x", name: "Claude Opus 5.5", organization: "openai" }, canonical), null, "makers disagree");
  assert.equal(matchCandidate({ key: "x", name: "Gemini 2.5 Pro (High)", organization: "google" }, canonical), null, "two Epoch entries share the name, so it is ambiguous");
  assert.equal(matchCandidate({ key: "x", name: "Totally New Model", organization: "acme" }, canonical), null);
});

test("matchCandidate: dated snapshots never borrow a sibling's score", () => {
  const canonical = parseEciRows(csvToObjects(ECI_CSV));
  assert.equal(matchCandidate({ key: "a", name: "DeepSeek-V4.1-Flash", organization: "deepseek", stamp: "1017" }, canonical)?.canonicalId, "deepseek-v4-1-flash-1017");
  assert.equal(matchCandidate({ key: "b", name: "DeepSeek-V4.1-Flash", organization: "deepseek", stamp: "0910" }, canonical), null, "has a dated sibling, so no fallback to the undated name");
  assert.equal(matchCandidate({ key: "c", name: "Claude Opus 5.5", organization: "anthropic", stamp: "0922" }, canonical)?.canonicalId, "claude-opus-5-5", "no dated sibling, so the undated name is safe");
});

test("matchCandidate: aliases win, and null aliases forbid a match", () => {
  const canonical = parseEciRows(csvToObjects(ECI_CSV));
  assert.equal(matchCandidate({ key: "Gemini 3.1 Pro Preview", name: "Gemini 3.1 Pro Preview", organization: "google" }, canonical, { "Gemini 3.1 Pro Preview": "Gemini 3.1 Pro" })?.via, "alias");
  assert.equal(matchCandidate({ key: "Claude Opus 5.5", name: "Claude Opus 5.5", organization: "anthropic" }, canonical, { "Claude Opus 5.5": null }), null);
});

test("API ids Epoch evaluated identify the model; ids claimed by two models match nothing", () => {
  const canonical = parseEciRows(csvToObjects(ECI_CSV));
  const versions = buildVersionIndex(csvToObjects(METADATA_CSV));
  const index = buildApiIdIndex(versions, canonical);
  assert.equal(index.get("gemini-3-1-pro-preview"), "gemini-3-1-pro");
  assert.equal(index.has("claude-opus-5-5-fallback"), false);
  assert.equal(matchCandidate({ key: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", organization: "google", apiId: "gemini-3.1-pro-preview" }, canonical, {}, index)?.via, "api-id");
  versions.set("shared-id", { group: "Qwen 3.8 Max", released: "", organization: "Alibaba", accessibility: "" });
  versions.set("shared-id_high", { group: "Claude Opus 5.5", released: "", organization: "Anthropic", accessibility: "" });
  assert.equal(buildApiIdIndex(versions, canonical).get("shared-id"), null);
});

test("OpenRouter candidates skip variants and free listings; conflicting prices are refused", () => {
  const candidates = openRouterPriceCandidates(OPENROUTER);
  assert.deepEqual(candidates.map((candidate) => candidate.openrouterId).sort(), ["anthropic/claude-opus-5.5", "deepseek/deepseek-v4.1-flash-1017", "google/gemini-3.1-pro-preview", "moonshotai/kimi-k3.1-pro"]);
  const opus = candidates.find((candidate) => candidate.openrouterId === "anthropic/claude-opus-5.5")!;
  assert.equal(opus.inputPerM, 4);
  assert.equal(opus.outputPerM, 20);
  assert.equal(opus.blendedPerM, blendedPrice(4, 20));
  assert.equal(blendedPrice(4, 20), 8);
  assert.equal(pickConsistentPrice([opus, { ...opus, openrouterId: "anthropic/claude-opus-5.5-alt" }])?.openrouterId, "anthropic/claude-opus-5.5");
  assert.equal(pickConsistentPrice([opus, { ...opus, openrouterId: "x", inputPerM: 5 }]), null);
});

/* ── Ranking and filtering ────────────────────────────────────────────── */

test("rankWithin renumbers from 1 inside the open/closed filter", () => {
  const rows = [{ id: "a", access: "closed" as const }, { id: "b", access: "open" as const }, { id: "c", access: "other" as const }, { id: "d", access: "open" as const }];
  assert.deepEqual(rankWithin(rows, "open").map(({ row, rank }) => [row.id, rank]), [["b", 1], ["d", 2]]);
  assert.deepEqual(rankWithin(rows, "closed").map(({ row, rank }) => [row.id, rank]), [["a", 1]]);
  assert.equal(rankWithin(rows, "all").length, 4);
});

test("rankBy sorts stably and drops rows without a value", () => {
  const rows = [{ id: "a", v: 2 }, { id: "b", v: null }, { id: "c", v: 1 }, { id: "d", v: 2 }];
  assert.deepEqual(rankBy(rows, (row) => row.v, "desc").map((row) => row.id), ["a", "d", "c"]);
  assert.deepEqual(rankBy(rows, (row) => row.v, "asc").map((row) => row.id), ["c", "a", "d"]);
});

test("valueFrontier keeps only models nothing else beats on both price and score", () => {
  const points = [{ id: "cheap", p: 0.1, s: 150 }, { id: "dominated", p: 1, s: 149 }, { id: "mid", p: 2, s: 160 }, { id: "top", p: 20, s: 170 }, { id: "pricier-same", p: 30, s: 170 }];
  assert.deepEqual(valueFrontier(points, (point) => point.p, (point) => point.s).map((point) => point.id), ["cheap", "mid", "top"]);
});

test("releasedWithin and priceChartRows apply the stated window and sort cheapest first", () => {
  assert.equal(releasedWithin("2026-01-01", "2026-11-14", 12), true);
  assert.equal(releasedWithin("2025-11-13", "2026-11-14", 12), false);
  const snapshot = buildFixture();
  const rows = priceChartRows(snapshot.models, "2026-11-14", 12);
  assert.deepEqual(rows.map((row) => row.id), ["deepseek-v4-1-flash-1017", "kimi-k3-1-pro", "gemini-3-1-pro", "claude-opus-5-5"]);
  assert.match(rows[0].note ?? "", /^in \$0\.038 · out \$0\.50$/);
});

test("formatValue renders each measure", () => {
  assert.equal(formatValue(168.54, "index"), "168.5");
  assert.equal(formatValue(1507.4, "arena"), "1,507");
  assert.equal(formatValue(0.9387, "percent"), "93.9%");
  assert.equal(formatValue(8, "usd"), "$8.00");
  assert.equal(formatValue(0.0887, "usd"), "$0.089");
  assert.equal(formatValue(1.25e12, "tokens"), "1.3T");
});

test("aggregateUsage sums the window, drops the 'other' row and labels via the snapshot", () => {
  const snapshot = buildFixture();
  const rows = aggregateUsage(
    [
      { date: "2026-11-12", model_permaslug: "anthropic/claude-opus-5.5-20260922", total_tokens: "100" },
      { date: "2026-11-13", model_permaslug: "anthropic/claude-opus-5.5-20260922", total_tokens: "50" },
      { date: "2026-11-13", model_permaslug: "acme/unknown-1", total_tokens: "120" },
      { date: "2026-11-13", model_permaslug: "other", total_tokens: "999" },
    ],
    [{ id: "anthropic/claude-opus-5.5", canonical_slug: "anthropic/claude-opus-5.5-20260922", name: "Anthropic: Claude Opus 5.5" }],
    snapshot.models,
  );
  assert.deepEqual(rows.map((row) => [row.name, row.value, row.access]), [["Claude Opus 5.5", 150, "closed"], ["acme/unknown-1", 120, "other"]]);
});

/* ── Snapshot ─────────────────────────────────────────────────────────── */

test("buildSnapshot cross-matches sources without guessing", () => {
  const snapshot = buildFixture();
  const byId = new Map(snapshot.models.map((model) => [model.id, model]));
  assert.equal(byId.get("claude-opus-5-5")?.arena?.score, 1507);
  assert.equal(byId.get("claude-opus-5-5")?.price?.openrouterId, "anthropic/claude-opus-5.5");
  assert.equal(byId.get("gemini-3-1-pro")?.arena?.entry, "Gemini 3.1 Pro Preview", "reviewed alias");
  assert.equal(byId.get("gemini-3-1-pro")?.price?.openrouterId, "google/gemini-3.1-pro-preview", "Epoch's API id");
  assert.equal(byId.get("deepseek-v4-1-flash")?.arena?.entry, "DeepSeek-V4.1-Flash-20260910 (Max)", "reviewed dated alias");
  assert.equal(byId.get("deepseek-v4-1-flash")?.price, null, "the 1017 listing is a different snapshot");
  assert.equal(byId.get("deepseek-v4-1-flash-1017")?.price?.openrouterId, "deepseek/deepseek-v4.1-flash-1017");
  assert.equal(byId.get("qwen-3-8-max")?.arena?.entry, "Qwen3.8-Max");
  assert.equal(byId.get("qwen3-8-max-0902")?.arena, null);
  assert.equal(byId.get("gemini-2-5-pro")?.arena, null);
  assert.equal(snapshot.arena.find((entry) => entry.name === "Mystery Model")?.canonicalId, null);
  assert.equal(snapshot.skills.length, 1);
  assert.equal(snapshot.skills[0].key, "science");
});

test("validateSnapshot accepts a built snapshot and rejects broken ones", () => {
  const snapshot = buildFixture();
  assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot);
  assert.equal(validateSnapshot(null), null);
  assert.equal(validateSnapshot({ version: 2 }), null);
  const brokenScore = JSON.parse(JSON.stringify(snapshot));
  brokenScore.models[0].eci.score = "high";
  assert.equal(validateSnapshot(brokenScore)?.models.length, snapshot.models.length - 1);
  const undatedArena = JSON.parse(JSON.stringify(snapshot));
  undatedArena.sources.lmarena.asOf = "";
  const checked = validateSnapshot(undatedArena)!;
  assert.equal(checked.arena.length, 0, "a source without a date loses its chart");
  assert.ok(checked.models.every((model) => model.arena === null));
});

test("the committed snapshot is valid, dated and uses no third-party-licensed Epoch file", () => {
  const raw = JSON.parse(fs.readFileSync("content/model-benchmarks.json", "utf8"));
  const snapshot = validateSnapshot(raw);
  assert.ok(snapshot, "snapshot validates");
  assert.equal(snapshot.models.length, raw.models.length, "no rows dropped by validation");
  assert.equal(snapshot.arena.length, raw.arena.length);
  for (const source of Object.values(snapshot.sources)) assert.match(source.asOf, /^\d{4}-\d{2}-\d{2}/);
  assert.ok(snapshot.models.length > 50 && snapshot.arena.length > 50);
  assert.ok(snapshot.models.some((model) => model.access === "open") && snapshot.models.some((model) => model.access === "closed"));
  assert.deepEqual(snapshot.skills.map((skill) => skill.key).sort(), ["coding", "maths", "science"]);
  const script = fs.readFileSync("scripts/update-model-benchmarks.ts", "utf8");
  assert.ok(script.includes("if (/_external\\.csv$/i.test(file)) throw"), "the script refuses *_external.csv files");
});
