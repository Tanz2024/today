// Pure logic behind the ranked AI model charts on /compare.
//
// Everything here is deterministic and free of I/O so it can be unit-tested
// (tests/model-rankings.test.ts) and shared by the snapshot script
// (scripts/update-model-benchmarks.ts) and the page. Nothing is estimated:
// a model that cannot be matched with confidence simply has no value for
// that measure.
//
// Imports use relative `.ts` paths so this file also runs under
// `node --experimental-strip-types` (tests and the snapshot script).

import { MODEL_ALIASES, type AliasSource } from "./model-aliases.ts";

/* ── Types ────────────────────────────────────────────────────────────── */

/** Whether a model's weights are published. "other" = the source does not say open or closed. */
export type Access = "open" | "closed" | "other";
export type AccessFilter = "all" | "open" | "closed";

export type Interval = { score: number; low: number; high: number };

/** One model in Epoch's Capabilities Index — the canonical model list. */
export type CanonicalModel = {
  id: string;
  /** Epoch's "Model" key (also its model_group in model_metadata.csv). */
  key: string;
  name: string;
  organization: string;
  released: string;
  access: Access;
  /** Epoch's own accessibility wording, e.g. "Open weights (restricted use)". */
  accessDetail: string;
  eci: Interval;
  /** Matched LMArena entry name and arena score, when a confident match exists. */
  arena: { entry: string; score: number } | null;
  /** Matched OpenRouter price, USD per 1M tokens, when a confident match exists. */
  price: Price | null;
};

export type Price = { openrouterId: string; inputPerM: number; outputPerM: number; blendedPerM: number };

export type SkillEntry = {
  id: string;
  name: string;
  organization: string;
  released: string;
  access: Access;
  accessDetail: string;
  /** Share of the benchmark solved, 0..1. */
  score: number;
  /** Epoch's model version id for the best run, e.g. "claude-opus-4-8_max". */
  version: string;
};

export type ArenaEntry = {
  id: string;
  /** Model name with LMArena's variant suffix removed, e.g. "Claude Opus 4.6". */
  name: string;
  /** LMArena's full entry name for the highest-rated variant, e.g. "Claude Opus 4.6 (High)". */
  entry: string;
  organization: string;
  license: string;
  access: Access;
  score: number;
  low: number;
  high: number;
  votes: number;
  /** Matched canonical (Epoch) model id, if any. */
  canonicalId: string | null;
};

export type SkillKey = "coding" | "maths" | "science";

export type SkillRanking = {
  key: SkillKey;
  label: string;
  benchmark: string;
  benchmarkUrl: string;
  entries: SkillEntry[];
};

export type ModelBenchmarksSnapshot = {
  version: 1;
  generatedAt: string;
  sources: {
    epoch: { asOf: string; fetchedAt: string; url: string; pageUrl: string; citation: string; license: string; licenseUrl: string };
    lmarena: { asOf: string; fetchedAt: string; url: string; config: string; category: string; license: string; licenseUrl: string };
    openrouter: { asOf: string; url: string };
  };
  models: CanonicalModel[];
  arena: ArenaEntry[];
  skills: SkillRanking[];
};

/* ── CSV ──────────────────────────────────────────────────────────────── */

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 1; } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** CSV with a header row → one object per row keyed by header. */
export function csvToObjects(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((cells) => Object.fromEntries(header.map((name, index) => [name.trim(), (cells[index] ?? "").trim()])));
}

/* ── Names and makers ─────────────────────────────────────────────────── */

/**
 * Comparable form of a model name across sources:
 * lower case, no "Maker:" prefix, no parenthetical variant ("(High)", "(batch)")
 * except a bare 4-digit snapshot stamp ("(0902)" → "0902"), no 8-digit date stamps, punctuation → spaces, and a space between letters and
 * a following number ("qwen3.8" → "qwen 3.8").
 */
export function normaliseModelName(name: string): string {
  return name
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^[^:]{1,40}:\s+/, "")
    .replace(/\((\d{4})\)/g, " $1 ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(19|20)\d{6}\b/g, " ")
    .replace(/[_/\-–—,:+]+/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip LMArena's variant suffixes so all variants of one model group together. */
export function baseArenaName(entry: string): string {
  return entry.replace(/\s*\([^)]*\)/g, "").replace(/[-\s]+(19|20)\d{6}\b/g, "").trim();
}

const MAKER_FAMILIES: Record<string, string> = {
  anthropic: "anthropic",
  google: "google", googledeepmind: "google", deepmind: "google",
  openai: "openai",
  xai: "xai",
  meta: "meta", metaai: "meta", metallama: "meta", facebook: "meta",
  deepseek: "deepseek",
  moonshot: "moonshot", moonshotai: "moonshot",
  zai: "zai", zaizhipuai: "zai", zhipuai: "zai", thudm: "zai",
  alibaba: "alibaba", qwen: "alibaba",
  mistral: "mistral", mistralai: "mistral",
  xiaomi: "xiaomi",
  baidu: "baidu",
  amazon: "amazon",
  minimax: "minimax",
  nvidia: "nvidia",
  microsoft: "microsoft",
  tencent: "tencent",
  bytedance: "bytedance", bytedanceseed: "bytedance",
  cohere: "cohere",
  ibm: "ibm", ibmgranite: "ibm",
};

/** Maker family for an organisation label from any source, or null when unknown. */
export function makerFamily(organization: string): string | null {
  const first = organization.split(",")[0] ?? "";
  const key = first.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  return MAKER_FAMILIES[key] ?? null;
}

/** False only when both makers are known and differ. */
export function makersAgree(a: string, b: string): boolean {
  const familyA = makerFamily(a);
  const familyB = makerFamily(b);
  return !familyA || !familyB || familyA === familyB;
}

export function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** "MMDD" from an 8-digit date stamp in a source name ("…-20260910", "(High, 20260813)"), else null. */
export function dateStamp(name: string): string | null {
  const match = name.match(/\b(?:19|20)\d{2}(\d{4})\b/);
  return match ? match[1] : null;
}

/* ── Open / closed ────────────────────────────────────────────────────── */

/** Epoch's "Model accessibility" wording → open/closed/other. Epoch's own grouping decides. */
export function accessFromEpoch(accessibility: string, group = ""): Access {
  if (/^open weights/i.test(accessibility) || /^open weights$/i.test(group)) return "open";
  if (/^closed weights$/i.test(group)) return "closed";
  if (!group && /^(api access|hosted access|unreleased)/i.test(accessibility)) return "closed";
  return "other";
}

/** LMArena's licence column: "Proprietary" → closed; a named licence → open; blank → other. */
export function accessFromArenaLicense(license: string): Access {
  const value = license.trim();
  if (!value || /^(other|unknown|n\/a)$/i.test(value)) return "other";
  return /^proprietary$/i.test(value) ? "closed" : "open";
}

/* ── Epoch Capabilities Index ─────────────────────────────────────────── */

const num = (value: string | number | bigint | null | undefined) => {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return typeof value === "bigint" ? Number(value) : Number(value);
};

export type EciRow = Omit<CanonicalModel, "arena" | "price">;

/** eci_scores.csv rows → canonical models, highest index first. Rows without a score are dropped. */
export function parseEciRows(rows: Record<string, string>[]): EciRow[] {
  const seen = new Set<string>();
  const models: EciRow[] = [];
  for (const row of rows) {
    const score = num(row.eci);
    const key = row.Model?.trim();
    if (!key || !Number.isFinite(score)) continue;
    const id = slugify(key);
    if (seen.has(id)) continue;
    seen.add(id);
    const low = num(row.eci_ci_low);
    const high = num(row.eci_ci_high);
    models.push({
      id,
      key,
      name: row["Display name"]?.trim() || key,
      organization: row.Organization?.trim() ?? "",
      released: row.date?.trim() ?? "",
      access: accessFromEpoch(row["Model accessibility"] ?? "", row["Accessibility group"] ?? ""),
      accessDetail: row["Model accessibility"]?.trim() ?? "",
      eci: { score, low: Number.isFinite(low) ? low : score, high: Number.isFinite(high) ? high : score },
    });
  }
  return models.sort((a, b) => b.eci.score - a.eci.score || a.name.localeCompare(b.name));
}

/* ── Epoch benchmark runs (per skill) ─────────────────────────────────── */

export type VersionInfo = { group: string; released: string; organization: string; accessibility: string };

/** model_metadata.csv → model version id → model group details. */
export function buildVersionIndex(rows: Record<string, string>[]): Map<string, VersionInfo> {
  const index = new Map<string, VersionInfo>();
  for (const row of rows) {
    const version = row.model_version?.trim();
    const group = row.model_group?.trim();
    if (!version || !group) continue;
    index.set(version, { group, released: row.date?.trim() ?? "", organization: row.organization?.trim() ?? "", accessibility: row.accessibility?.trim() ?? "" });
  }
  return index;
}

/**
 * One Epoch-run benchmark file → one row per model (group), keeping that
 * model's best run across settings (reasoning effort etc.). Runs marked
 * "fallback" are excluded: they are not the model alone. Rows whose version is
 * not in model_metadata.csv are excluded rather than guessed.
 */
export function aggregateBenchmark(rows: Record<string, string>[], versions: Map<string, VersionInfo>, scoreColumn = "Best score (across scorers)"): SkillEntry[] {
  const best = new Map<string, SkillEntry>();
  for (const row of rows) {
    const version = row["Model version"]?.trim();
    const score = num(row[scoreColumn] || row.mean_score);
    if (!version || !Number.isFinite(score) || /fallback/i.test(version)) continue;
    const info = versions.get(version);
    if (!info) continue;
    const id = slugify(info.group);
    const current = best.get(id);
    if (current && current.score >= score) continue;
    best.set(id, {
      id,
      name: info.group,
      organization: info.organization || row.Organization?.trim() || "",
      released: info.released || row["Release date"]?.trim() || "",
      access: accessFromEpoch(info.accessibility),
      accessDetail: info.accessibility,
      score,
      version,
    });
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Prefer the canonical (ECI) organisation/access for skill rows whose model is in the index. */
export function alignSkillEntries(entries: SkillEntry[], canonical: EciRow[]): SkillEntry[] {
  const byId = new Map(canonical.map((model) => [model.id, model]));
  return entries.map((entry) => {
    const model = byId.get(entry.id);
    return model ? { ...entry, name: model.name, organization: model.organization || entry.organization, access: model.access, accessDetail: model.accessDetail || entry.accessDetail } : entry;
  });
}

/* ── LMArena ──────────────────────────────────────────────────────────── */

export type ArenaRow = {
  model_name: string;
  organization: string;
  license: string;
  rating: number | bigint;
  rating_lower: number | bigint;
  rating_upper: number | bigint;
  vote_count: number | bigint;
  category: string;
  leaderboard_publish_date: string;
};

/**
 * LMArena rows for one category → one entry per model: the highest-rated
 * variant of each model name (variants such as "(High)" or dated snapshots are
 * grouped). Highest score first.
 */
export function dedupeArena(rows: ArenaRow[], category = "overall"): Omit<ArenaEntry, "canonicalId">[] {
  const best = new Map<string, Omit<ArenaEntry, "canonicalId">>();
  for (const row of rows) {
    if (row.category !== category) continue;
    const score = num(row.rating);
    if (!row.model_name || !Number.isFinite(score)) continue;
    const name = baseArenaName(row.model_name) || row.model_name;
    // Variants of one snapshot group together; differently dated snapshots stay separate.
    const stamp = dateStamp(row.model_name);
    const key = `${makerFamily(row.organization ?? "") ?? row.organization}|${normaliseModelName(name)}|${stamp ?? ""}`;
    const current = best.get(key);
    if (current && current.score >= score) continue;
    best.set(key, {
      id: slugify(`${row.organization}-${name}${stamp ? `-${stamp}` : ""}`),
      name,
      entry: row.model_name,
      organization: row.organization ?? "",
      license: row.license ?? "",
      access: accessFromArenaLicense(row.license ?? ""),
      score,
      low: num(row.rating_lower),
      high: num(row.rating_upper),
      votes: num(row.vote_count),
    });
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Alias-map key for an LMArena entry: its name without variant suffix, plus "@MMDD" for a dated snapshot. */
export function arenaAliasKey(entry: Pick<ArenaEntry, "name" | "entry">): string {
  const stamp = dateStamp(entry.entry);
  return stamp ? `${entry.name} @${stamp}` : entry.name;
}

/* ── OpenRouter prices ────────────────────────────────────────────────── */

export type OpenRouterModel = { id: string; name: string; pricing?: { prompt?: string; completion?: string } };

/** Blended price, USD per 1M tokens, weighting input:output 3:1 (stated on the page). */
export function blendedPrice(inputPerM: number, outputPerM: number): number {
  return (3 * inputPerM + outputPerM) / 4;
}

/**
 * Candidate OpenRouter listings for price matching: base ids only (no
 * ":free", ":batch" or other variants), both prices positive.
 */
export function openRouterPriceCandidates(models: OpenRouterModel[]): (Price & { name: string })[] {
  return models
    .filter((model) => model.id && !model.id.includes(":"))
    .map((model) => ({ model, input: Number(model.pricing?.prompt), output: Number(model.pricing?.completion) }))
    .filter(({ input, output }) => Number.isFinite(input) && Number.isFinite(output) && input > 0 && output > 0)
    .map(({ model, input, output }) => {
      const inputPerM = roundPrice(input * 1_000_000);
      const outputPerM = roundPrice(output * 1_000_000);
      return { openrouterId: model.id, name: model.name, inputPerM, outputPerM, blendedPerM: roundPrice(blendedPrice(inputPerM, outputPerM)) };
    });
}

const roundPrice = (value: number) => Math.round(value * 1e6) / 1e6;

/* ── Matching ─────────────────────────────────────────────────────────── */

export type MatchCandidate = {
  key: string;
  name: string;
  organization: string;
  /** "MMDD" snapshot stamp, if the source names one. */
  stamp?: string | null;
  /** API model id without provider prefix (OpenRouter "google/x" → "x"), if any. */
  apiId?: string;
};
export type MatchResult = { canonicalId: string; via: "alias" | "api-id" | "name" } | null;
type CanonicalRef = Pick<CanonicalModel, "id" | "key" | "name" | "organization">;

function uniqueByName(canonical: CanonicalRef[], wanted: string): CanonicalRef[] {
  const hits = canonical.filter((item) => normaliseModelName(item.key) === wanted || normaliseModelName(item.name) === wanted);
  return [...new Map(hits.map((item) => [item.id, item])).values()];
}

/**
 * Match one source row to a canonical model.
 * 1. An explicit alias (by the source's exact key) wins; an alias of `null` means "never match".
 * 2. An API id that Epoch lists among the versions it evaluated for exactly one
 *    canonical model (model_metadata.csv, e.g. "gemini-3.1-pro-preview_high"
 *    → "Gemini 3.1 Pro") is that model; an id Epoch lists under several
 *    models matches none.
 * 3. A dated snapshot ("…-20260813") first tries the canonical name with that
 *    date ("… 0813"). It falls back to the undated name only when the
 *    canonical list has no dated sibling of that name, so one snapshot is never
 *    credited to another.
 * 4. Otherwise the normalised name must equal exactly one canonical model's
 *    normalised name and the makers must not disagree.
 * Anything else is no match — never a guess.
 */
export function matchCandidate(candidate: MatchCandidate, canonical: CanonicalRef[], aliases: Record<string, string | null> = {}, apiIds?: Map<string, string | null>): MatchResult {
  if (Object.prototype.hasOwnProperty.call(aliases, candidate.key)) {
    const target = aliases[candidate.key];
    if (target === null) return null;
    const model = canonical.find((item) => item.key === target || item.name === target || item.id === target);
    return model ? { canonicalId: model.id, via: "alias" } : null;
  }
  if (candidate.apiId && apiIds) {
    const hit = apiIds.get(normaliseApiId(candidate.apiId));
    if (hit) return { canonicalId: hit, via: "api-id" };
    if (hit === null) return null;
  }
  const wanted = normaliseModelName(candidate.name);
  if (!wanted) return null;
  let unique: CanonicalRef[] = [];
  if (candidate.stamp) {
    unique = uniqueByName(canonical, `${wanted} ${candidate.stamp}`);
    if (!unique.length) {
      const datedSibling = new RegExp(`^${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\d{4}$`);
      if (canonical.some((item) => datedSibling.test(normaliseModelName(item.key)))) return null;
    }
  }
  if (!unique.length) unique = uniqueByName(canonical, wanted);
  if (unique.length !== 1) return null;
  return makersAgree(candidate.organization, unique[0].organization) ? { canonicalId: unique[0].id, via: "name" } : null;
}

/**
 * Match many source rows. When several rows land on one canonical model the
 * `pick` function chooses between them; returning null drops the match
 * (ambiguous).
 */
export function matchAll<T>(rows: T[], toCandidate: (row: T) => MatchCandidate, canonical: CanonicalRef[], aliases: Record<string, string | null>, pick: (rows: T[]) => T | null, apiIds?: Map<string, string | null>): Map<string, T> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const match = matchCandidate(toCandidate(row), canonical, aliases, apiIds);
    if (!match) continue;
    grouped.set(match.canonicalId, [...(grouped.get(match.canonicalId) ?? []), row]);
  }
  const result = new Map<string, T>();
  for (const [id, group] of grouped) {
    const chosen = group.length === 1 ? group[0] : pick(group);
    if (chosen) result.set(id, chosen);
  }
  return result;
}

const EFFORT_SUFFIX = /_(none|minimal|low|medium|high|xhigh|max|unknown)$/i;

/** Comparable API id: lower case, no effort suffix, dots as dashes ("grok-4.20" = "grok-4-20"). */
export function normaliseApiId(id: string): string {
  return id.toLowerCase().replace(EFFORT_SUFFIX, "").replace(/\./g, "-");
}

/**
 * Epoch's evaluated model versions → canonical model id, for API-id matching.
 * Only versions whose group is in the canonical list count; an id claimed by
 * two canonical models maps to null (ambiguous). Provider-path ids
 * ("accounts/…/model") are skipped.
 */
export function buildApiIdIndex(versions: Map<string, VersionInfo>, canonical: CanonicalRef[]): Map<string, string | null> {
  const byKey = new Map(canonical.map((model) => [model.key, model.id]));
  const index = new Map<string, string | null>();
  for (const [version, info] of versions) {
    const canonicalId = byKey.get(info.group);
    if (!canonicalId || version.includes("/") || /fallback/i.test(version)) continue;
    const id = normaliseApiId(version);
    const existing = index.get(id);
    index.set(id, existing === undefined || existing === canonicalId ? canonicalId : null);
  }
  return index;
}

export function aliasesFor(source: AliasSource): Record<string, string | null> {
  return MODEL_ALIASES[source];
}

/** Several OpenRouter listings for one model are only accepted when they agree on price. */
export function pickConsistentPrice<T extends Price>(rows: T[]): T | null {
  const first = rows[0];
  if (!first) return null;
  return rows.every((row) => row.inputPerM === first.inputPerM && row.outputPerM === first.outputPerM) ? [...rows].sort((a, b) => a.openrouterId.length - b.openrouterId.length)[0] : null;
}

/* ── Snapshot assembly ────────────────────────────────────────────────── */

export const SKILL_BENCHMARKS: { key: SkillKey; label: string; benchmark: string; file: string; benchmarkUrl: string }[] = [
  { key: "coding", label: "Coding", benchmark: "SWE-bench Verified (Epoch run)", file: "swe_bench_verified.csv", benchmarkUrl: "https://epoch.ai/benchmarks/swe-bench-verified" },
  { key: "maths", label: "Maths", benchmark: "FrontierMath Tiers 1–3", file: "frontiermath_tiers_1_3_v2.csv", benchmarkUrl: "https://epoch.ai/frontiermath" },
  { key: "science", label: "Science", benchmark: "GPQA Diamond", file: "gpqa_diamond.csv", benchmarkUrl: "https://epoch.ai/benchmarks/gpqa-diamond" },
];

export type SnapshotInputs = {
  eciCsv: string;
  metadataCsv: string;
  benchmarkCsv: Record<string, string>;
  arenaRows: ArenaRow[];
  openRouterModels: OpenRouterModel[];
  sources: ModelBenchmarksSnapshot["sources"];
  generatedAt: string;
};

/** Parse, normalise and cross-match every source into one snapshot. */
export function buildSnapshot(inputs: SnapshotInputs): ModelBenchmarksSnapshot {
  const eci = parseEciRows(csvToObjects(inputs.eciCsv));
  const versions = buildVersionIndex(csvToObjects(inputs.metadataCsv));

  const arenaEntries = dedupeArena(inputs.arenaRows, inputs.sources.lmarena.category);
  const arenaMatches = matchAll(arenaEntries, (entry) => ({ key: arenaAliasKey(entry), name: entry.name, organization: entry.organization, stamp: dateStamp(entry.entry) }), eci, aliasesFor("lmarena"), (rows) => [...rows].sort((a, b) => b.score - a.score)[0] ?? null);
  const arenaByEntry = new Map([...arenaMatches].map(([canonicalId, entry]) => [entry.id, canonicalId]));

  const priceCandidates = openRouterPriceCandidates(inputs.openRouterModels);
  const apiIds = buildApiIdIndex(versions, eci);
  const priceMatches = matchAll(priceCandidates, (row) => ({ key: row.openrouterId, name: row.name, organization: row.openrouterId.split("/")[0] ?? "", apiId: row.openrouterId.split("/").slice(1).join("/") }), eci, aliasesFor("openrouter"), pickConsistentPrice, apiIds);

  const models: CanonicalModel[] = eci.map((model) => {
    const arena = arenaMatches.get(model.id);
    const price = priceMatches.get(model.id);
    return {
      ...model,
      arena: arena ? { entry: arena.entry, score: arena.score } : null,
      price: price ? { openrouterId: price.openrouterId, inputPerM: price.inputPerM, outputPerM: price.outputPerM, blendedPerM: price.blendedPerM } : null,
    };
  });

  const skills: SkillRanking[] = SKILL_BENCHMARKS.flatMap(({ key, label, benchmark, file, benchmarkUrl }) => {
    const csv = inputs.benchmarkCsv[file];
    if (!csv) return [];
    const entries = alignSkillEntries(aggregateBenchmark(csvToObjects(csv), versions), eci);
    return entries.length ? [{ key, label, benchmark, benchmarkUrl, entries }] : [];
  });

  return {
    version: 1,
    generatedAt: inputs.generatedAt,
    sources: inputs.sources,
    models,
    arena: arenaEntries.map((entry) => ({ ...entry, canonicalId: arenaByEntry.get(entry.id) ?? null })),
    skills,
  };
}

/* ── Validation (the page trusts nothing it did not check) ────────────── */

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isAccess = (value: unknown): value is Access => value === "open" || value === "closed" || value === "other";
const isDate = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}/.test(value);

function isPrice(value: unknown): value is Price {
  return isObject(value) && isString(value.openrouterId) && isFiniteNumber(value.inputPerM) && isFiniteNumber(value.outputPerM) && isFiniteNumber(value.blendedPerM);
}

function isCanonical(value: unknown): value is CanonicalModel {
  if (!isObject(value) || !isString(value.id) || !isString(value.name) || !isString(value.organization) || !isAccess(value.access)) return false;
  const eci = value.eci;
  if (!isObject(eci) || !isFiniteNumber(eci.score) || !isFiniteNumber(eci.low) || !isFiniteNumber(eci.high)) return false;
  if (value.price !== null && !isPrice(value.price)) return false;
  if (value.arena !== null && !(isObject(value.arena) && isString(value.arena.entry) && isFiniteNumber(value.arena.score))) return false;
  return true;
}

function isArenaEntry(value: unknown): value is ArenaEntry {
  return isObject(value) && isString(value.id) && isString(value.name) && isString(value.entry) && isAccess(value.access) && isFiniteNumber(value.score) && isFiniteNumber(value.low) && isFiniteNumber(value.high) && isFiniteNumber(value.votes);
}

function isSkillEntry(value: unknown): value is SkillEntry {
  return isObject(value) && isString(value.id) && isString(value.name) && isAccess(value.access) && isFiniteNumber(value.score) && value.score >= 0 && value.score <= 1;
}

/**
 * Returns the snapshot only when its shape is intact: sources dated, every
 * score a finite number. Invalid rows are dropped; a source whose
 * date is missing loses its rows so its chart is hidden.
 */
export function validateSnapshot(value: unknown): ModelBenchmarksSnapshot | null {
  if (!isObject(value) || value.version !== 1 || !isObject(value.sources)) return null;
  const sources = value.sources as ModelBenchmarksSnapshot["sources"];
  const epochOk = isObject(sources.epoch) && isDate(sources.epoch.asOf);
  const arenaOk = isObject(sources.lmarena) && isDate(sources.lmarena.asOf);
  const priceOk = isObject(sources.openrouter) && isDate(sources.openrouter.asOf);
  const models = epochOk && Array.isArray(value.models) ? value.models.filter(isCanonical).map((model) => ({ ...model, price: priceOk ? model.price : null, arena: arenaOk ? model.arena : null })) : [];
  const arena = arenaOk && Array.isArray(value.arena) ? value.arena.filter(isArenaEntry) : [];
  const skills = epochOk && Array.isArray(value.skills)
    ? (value.skills as unknown[]).filter((skill): skill is SkillRanking => isObject(skill) && isString(skill.key) && isString(skill.label) && isString(skill.benchmark) && Array.isArray(skill.entries)).map((skill) => ({ ...skill, entries: skill.entries.filter(isSkillEntry) })).filter((skill) => skill.entries.length > 0)
    : [];
  if (!models.length && !arena.length && !skills.length) return null;
  return { version: 1, generatedAt: isString(value.generatedAt) ? value.generatedAt : "", sources, models, arena, skills };
}

/* ── Ranking helpers used by the charts ───────────────────────────────── */

export function matchesAccess(access: Access, filter: AccessFilter): boolean {
  return filter === "all" || access === filter;
}

/** Keep rows matching the filter; ranks are 1..n within the filtered list. */
export function rankWithin<T extends { access: Access }>(rows: T[], filter: AccessFilter): { row: T; rank: number }[] {
  return rows.filter((row) => matchesAccess(row.access, filter)).map((row, index) => ({ row, rank: index + 1 }));
}

/** Stable sort by a numeric value; rows without a value are dropped. */
export function rankBy<T>(rows: T[], value: (row: T) => number | null | undefined, direction: "asc" | "desc"): T[] {
  return rows
    .map((row, index) => ({ row, index, value: value(row) }))
    .filter((item): item is { row: T; index: number; value: number } => typeof item.value === "number" && Number.isFinite(item.value))
    .sort((a, b) => (direction === "asc" ? a.value - b.value : b.value - a.value) || a.index - b.index)
    .map((item) => item.row);
}

/**
 * Value frontier: models for which no other model is both cheaper (or equal)
 * and scores higher (or equal), with at least one strict. Sorted by price.
 */
export function valueFrontier<T>(rows: T[], price: (row: T) => number, score: (row: T) => number): T[] {
  const sorted = [...rows].sort((a, b) => price(a) - price(b) || score(b) - score(a));
  const frontier: T[] = [];
  let best = Number.NEGATIVE_INFINITY;
  for (const row of sorted) {
    if (score(row) > best) { frontier.push(row); best = score(row); }
  }
  return frontier;
}

/** Evenly spaced, rounded axis ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw) ?? raw;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 1e-9; tick += step) ticks.push(Number(tick.toFixed(10)));
  return ticks;
}

/* ── Chart rows (plain data handed to the client chart components) ────── */

export type ValueFormat = "index" | "arena" | "percent" | "usd" | "tokens";

export type ChartRow = {
  id: string;
  name: string;
  /** Secondary line: maker, date, the source's own entry name. */
  meta: string;
  access: Access;
  /** Source wording behind the open/closed label. */
  accessDetail: string;
  value: number;
  low?: number;
  high?: number;
  /** Extra text after the value, e.g. input/output prices. */
  note?: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-09" → "Nov 2026" (string maths, so no time-zone shifts). */
export function monthLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  return match ? `${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`.trim() : "";
}

/** "2026-11-09" → "9 Nov 2026". */
export function dayLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : date;
}

const ORG_NAMES: Record<string, string> = {
  openai: "OpenAI", xai: "xAI", zai: "Z.ai", deepseek: "DeepSeek", meta: "Meta", google: "Google", anthropic: "Anthropic",
  alibaba: "Alibaba", moonshot: "Moonshot", xiaomi: "Xiaomi", baidu: "Baidu", mistral: "Mistral", minimax: "MiniMax",
  nvidia: "Nvidia", tencent: "Tencent", bytedance: "ByteDance", amazon: "Amazon", microsoft: "Microsoft", cohere: "Cohere", ibm: "IBM",
};

/** Readable organisation: Epoch's names as given; LMArena's lower-case slugs mapped when known. */
export function displayOrganization(organization: string): string {
  const value = organization.split(",").map((part) => part.trim()).filter(Boolean).join(", ");
  if (/[A-Z]/.test(value)) return value;
  return ORG_NAMES[value.replace(/[^a-z0-9]/g, "")] ?? value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const metaLine = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" · ");

export function eciChartRows(models: CanonicalModel[]): ChartRow[] {
  return models.map((model) => ({
    id: model.id,
    name: model.name,
    meta: metaLine(displayOrganization(model.organization), monthLabel(model.released)),
    access: model.access,
    accessDetail: model.accessDetail,
    value: model.eci.score,
    low: model.eci.low,
    high: model.eci.high,
  }));
}

/** The LMArena variant behind a grouped entry: "Claude Opus 4.6 (High)" → "variant (High)". */
export function variantLabel(entry: Pick<ArenaEntry, "name" | "entry">): string | undefined {
  if (entry.entry === entry.name) return undefined;
  const suffix = entry.entry.startsWith(entry.name) ? entry.entry.slice(entry.name.length).replace(/^[-\s]+/, "").trim() : entry.entry;
  return suffix ? `variant ${suffix}` : undefined;
}

export function arenaChartRows(entries: ArenaEntry[], models: CanonicalModel[]): ChartRow[] {
  const byId = new Map(models.map((model) => [model.id, model]));
  return entries.map((entry) => {
    const model = entry.canonicalId ? byId.get(entry.canonicalId) : undefined;
    return {
      id: entry.id,
      name: entry.name,
      meta: metaLine(displayOrganization(model?.organization ?? entry.organization), `${entry.votes.toLocaleString("en-GB")} votes`, variantLabel(entry)),
      access: entry.access,
      accessDetail: entry.license ? `Licence: ${entry.license}` : "Licence not stated",
      value: entry.score,
      low: entry.low,
      high: entry.high,
    };
  });
}

export function skillChartRows(entries: SkillEntry[]): ChartRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    meta: metaLine(displayOrganization(entry.organization), monthLabel(entry.released)),
    access: entry.access,
    accessDetail: entry.accessDetail,
    value: entry.score,
  }));
}

/** True when `date` falls within the `months` before `asOf` (inclusive). */
export function releasedWithin(date: string, asOf: string, months: number): boolean {
  const end = Date.parse(asOf);
  const released = Date.parse(date);
  if (!Number.isFinite(end) || !Number.isFinite(released)) return false;
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - months);
  return released >= start.getTime() && released <= end;
}

export function formatUsd(value: number): string {
  if (value >= 100) return `$${value.toFixed(0)}`;
  if (value >= 0.1) return `$${value.toFixed(2)}`;
  return `$${Number(value.toPrecision(2))}`;
}

export function formatValue(value: number, format: ValueFormat): string {
  switch (format) {
    case "index": return value.toFixed(1);
    case "arena": return Math.round(value).toLocaleString("en-GB");
    case "percent": return `${(value * 100).toFixed(1)}%`;
    case "usd": return formatUsd(value);
    case "tokens": {
      const units: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
      const [size, suffix] = units.find(([unit]) => value >= unit) ?? [1, ""];
      return `${(value / size).toFixed(value / size >= 100 ? 0 : 1)}${suffix}`;
    }
  }
}

type Priced = CanonicalModel & { price: Price };
const pricedWithin = (models: CanonicalModel[], asOf: string, months: number) => models.filter((model): model is Priced => model.price !== null && releasedWithin(model.released, asOf, months));

/** Priced models released in the window, cheapest blended price first. */
export function priceChartRows(models: CanonicalModel[], asOf: string, months: number): ChartRow[] {
  return rankBy(pricedWithin(models, asOf, months), (model) => model.price.blendedPerM, "asc").map((model) => ({
    id: model.id,
    name: model.name,
    meta: metaLine(displayOrganization(model.organization), monthLabel(model.released)),
    access: model.access,
    accessDetail: model.accessDetail,
    value: model.price.blendedPerM,
    note: `in ${formatUsd(model.price.inputPerM)} · out ${formatUsd(model.price.outputPerM)}`,
  }));
}

export type ValuePoint = {
  id: string;
  name: string;
  organization: string;
  access: Access;
  accessDetail: string;
  released: string;
  score: number;
  price: number;
  inputPerM: number;
  outputPerM: number;
  arena: number | null;
};

/** Models with both an index score and a price, released in the window. */
export function valuePoints(models: CanonicalModel[], asOf: string, months: number): ValuePoint[] {
  return pricedWithin(models, asOf, months).map((model) => ({
    id: model.id,
    name: model.name,
    organization: displayOrganization(model.organization),
    access: model.access,
    accessDetail: model.accessDetail,
    released: model.released,
    score: model.eci.score,
    price: model.price.blendedPerM,
    inputPerM: model.price.inputPerM,
    outputPerM: model.price.outputPerM,
    arena: model.arena?.score ?? null,
  }));
}

/* ── OpenRouter usage (optional "Most used" chart) ────────────────────── */

export type UsageRow = { date: string; model_permaslug: string; total_tokens: string | number };
export type CatalogueEntry = { id: string; canonical_slug?: string; name: string };

/**
 * Sum the daily top-50 token totals per model across the window (the reserved
 * "other" row is excluded). Names come from the models API (canonical_slug);
 * open/closed comes from the snapshot's matched OpenRouter ids, else "other".
 */
export function aggregateUsage(rows: UsageRow[], catalogue: CatalogueEntry[], models: CanonicalModel[]): ChartRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.model_permaslug || row.model_permaslug === "other") continue;
    const tokens = Number(row.total_tokens);
    if (!Number.isFinite(tokens) || tokens < 0) continue;
    totals.set(row.model_permaslug, (totals.get(row.model_permaslug) ?? 0) + tokens);
  }
  const bySlug = new Map(catalogue.filter((item) => item.canonical_slug).map((item) => [item.canonical_slug as string, item]));
  const byOpenRouterId = new Map(models.filter((model): model is Priced => model.price !== null).map((model) => [model.price.openrouterId, model]));
  return [...totals]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([slug, tokens]) => {
      const listing = bySlug.get(slug);
      const model = listing ? byOpenRouterId.get(listing.id) : undefined;
      return {
        id: slug,
        name: model?.name ?? listing?.name.replace(/^[^:]{1,40}:\s+/, "") ?? slug,
        meta: model ? metaLine(displayOrganization(model.organization), monthLabel(model.released)) : listing?.id ?? slug,
        access: model?.access ?? "other",
        accessDetail: model ? model.accessDetail : "Not matched to Epoch's index, so not labelled open or closed",
        value: tokens,
      };
    });
}
