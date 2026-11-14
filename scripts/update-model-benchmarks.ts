// Refreshes content/model-benchmarks.json, the snapshot behind the ranked
// model charts on /compare.
//   npm run models:update
//
// Downloads three openly licensed sources, normalises them, matches model
// names across them (lib/model-rankings.ts + the reviewed alias map in
// lib/model-aliases.ts) and writes one JSON file with a per-source "as of"
// date. The page reads only that file, so a source outage never reaches
// visitors and every change to the numbers is reviewable in a diff.
//
// Licences, re-confirmed when this script was written (Nov 2026):
//
// 1. Epoch AI — https://epoch.ai/data/benchmark_data.zip
//    https://epoch.ai/benchmarks/use-this-data#licensing and the ZIP's README.md:
//    "Epoch AI's data is free to use, distribute, and reproduce provided the
//    source and authors are credited under the Creative Commons Attribution
//    license" (CC BY 4.0). The same page: "This hub also includes data sourced
//    from external projects, which retains its original licensing." — so only
//    Epoch's own files are read here and every `*_external.csv` is refused.
//
// 2. LMArena — Hugging Face dataset lmarena-ai/leaderboard-dataset
//    https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset — dataset
//    card front matter: "license: cc-by-4.0". Read from the dataset's published
//    parquet files only; never from the arena website (its terms forbid
//    automated access).
//
// 3. OpenRouter models API — https://openrouter.ai/api/v1/models (public, no
//    key) for API prices, as already used by lib/model-data.ts.
//
// Requests carry a generic User-Agent and no project or personal details.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { parquetReadObjects } from "hyparquet";
import { buildSnapshot, type ArenaRow, type ModelBenchmarksSnapshot, type OpenRouterModel, SKILL_BENCHMARKS, validateSnapshot } from "../lib/model-rankings.ts";

const OUTPUT = "content/model-benchmarks.json";
const USER_AGENT = "Mozilla/5.0 (compatible; data-snapshot/1.0)";

const EPOCH_ZIP = "https://epoch.ai/data/benchmark_data.zip";
const EPOCH_PAGE = "https://epoch.ai/benchmarks";
const EPOCH_CITATION = "Epoch AI, ‘Capabilities & benchmarking’. Published online at epoch.ai. Retrieved from ‘https://epoch.ai/benchmarks’ [online resource].";

const ARENA_DATASET = "lmarena-ai/leaderboard-dataset";
// Text arena with style control: the default view of LMArena's text leaderboard.
const ARENA_CONFIG = "text_style_control";
const ARENA_CATEGORY = "overall";

const OPENROUTER_MODELS = "https://openrouter.ai/api/v1/models";

async function download(url: string, attempts = 3): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw new Error(`Download failed: ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/* ── Minimal ZIP reader (stored + deflate entries) using node:zlib ─────── */

type ZipEntry = { name: string; modified: string; read: () => Buffer };

function readZip(buffer: Buffer): ZipEntry[] {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-central-directory record)");
  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) throw new Error("Corrupt ZIP central directory");
    const method = buffer.readUInt16LE(pointer + 10);
    const time = buffer.readUInt16LE(pointer + 12);
    const date = buffer.readUInt16LE(pointer + 14);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.subarray(pointer + 46, pointer + 46 + nameLength).toString("utf8");
    const modified = `${1980 + (date >> 9)}-${String((date >> 5) & 15).padStart(2, "0")}-${String(date & 31).padStart(2, "0")}T${String(time >> 11).padStart(2, "0")}:${String((time >> 5) & 63).padStart(2, "0")}:00Z`;
    entries.push({
      name,
      modified,
      read: () => {
        const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
        const data = buffer.subarray(dataStart, dataStart + compressedSize);
        if (method === 0) return Buffer.from(data);
        if (method === 8) return inflateRawSync(data);
        throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);
      },
    });
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/* ── Sources ─────────────────────────────────────────────────────────── */

async function loadEpoch() {
  const zip = readZip(await download(EPOCH_ZIP));
  const byBase = new Map(zip.map((entry) => [entry.name.split("/").pop() ?? entry.name, entry]));
  const take = (file: string) => {
    if (/_external\.csv$/i.test(file)) throw new Error(`Refusing third-party-licensed file ${file}`);
    const entry = byBase.get(file);
    if (!entry) throw new Error(`Epoch ZIP is missing ${file}`);
    return entry;
  };
  const readme = take("README.md").read().toString("utf8");
  if (!/free to use, distribute, and reproduce/i.test(readme) || !/creativecommons\.org\/licenses\/by\/4\.0/i.test(readme)) {
    throw new Error("Epoch README no longer states the CC BY 4.0 licence; review before publishing.");
  }
  const used = [take("eci_scores.csv"), take("model_metadata.csv"), ...SKILL_BENCHMARKS.map(({ file }) => take(file))];
  // "As of" = the newest file Epoch put in the archive.
  const asOf = used.map((entry) => entry.modified).sort().at(-1)!.slice(0, 10);
  return {
    asOf,
    eciCsv: used[0].read().toString("utf8"),
    metadataCsv: used[1].read().toString("utf8"),
    benchmarkCsv: Object.fromEntries(SKILL_BENCHMARKS.map(({ file }) => [file, take(file).read().toString("utf8")])),
  };
}

async function loadArena() {
  const info = JSON.parse((await download(`https://huggingface.co/api/datasets/${ARENA_DATASET}`)).toString("utf8")) as { sha: string; cardData?: { license?: string | string[] } };
  const license = [info.cardData?.license].flat().join(",");
  if (!/cc-by-4\.0/i.test(license)) throw new Error(`LMArena dataset licence is now "${license}"; review before publishing.`);
  const tree = JSON.parse((await download(`https://huggingface.co/api/datasets/${ARENA_DATASET}/tree/${info.sha}/${ARENA_CONFIG}`)).toString("utf8")) as { path: string }[];
  const files = tree.map((item) => item.path).filter((path) => /\/latest-[^/]+\.parquet$/.test(path)).sort();
  if (!files.length) throw new Error(`No latest parquet files for ${ARENA_CONFIG}`);
  const rows: ArenaRow[] = [];
  for (const path of files) {
    const buffer = await download(`https://huggingface.co/datasets/${ARENA_DATASET}/resolve/${info.sha}/${path}`);
    const file = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    rows.push(...((await parquetReadObjects({ file })) as ArenaRow[]));
  }
  const dates = rows.filter((row) => row.category === ARENA_CATEGORY).map((row) => row.leaderboard_publish_date).filter(Boolean).sort();
  if (!dates.length) throw new Error("LMArena rows have no publish date");
  return { rows, asOf: dates.at(-1)!, revision: info.sha };
}

async function loadOpenRouter() {
  const body = JSON.parse((await download(OPENROUTER_MODELS)).toString("utf8")) as { data: OpenRouterModel[] };
  if (!Array.isArray(body.data) || body.data.length < 50) throw new Error("OpenRouter models response looks incomplete");
  return body.data;
}

/* ── Main ────────────────────────────────────────────────────────────── */

const fetchedAt = new Date().toISOString();
const [epoch, arena, openRouterModels] = await Promise.all([loadEpoch(), loadArena(), loadOpenRouter()]);

const snapshot: ModelBenchmarksSnapshot = buildSnapshot({
  eciCsv: epoch.eciCsv,
  metadataCsv: epoch.metadataCsv,
  benchmarkCsv: epoch.benchmarkCsv,
  arenaRows: arena.rows,
  openRouterModels,
  generatedAt: fetchedAt,
  sources: {
    epoch: { asOf: epoch.asOf, fetchedAt, url: EPOCH_ZIP, pageUrl: EPOCH_PAGE, citation: EPOCH_CITATION, license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
    lmarena: { asOf: arena.asOf, fetchedAt, url: `https://huggingface.co/datasets/${ARENA_DATASET}`, config: ARENA_CONFIG, category: ARENA_CATEGORY, license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
    openrouter: { asOf: fetchedAt.slice(0, 10), url: OPENROUTER_MODELS },
  },
});

if (!validateSnapshot(snapshot)) throw new Error("Built snapshot failed validation; not writing it.");

const previous = existsSync(OUTPUT) ? (JSON.parse(readFileSync(OUTPUT, "utf8")) as ModelBenchmarksSnapshot) : null;
writeFileSync(OUTPUT, `${JSON.stringify(snapshot, null, 1)}\n`);

/* Match report for review. */
const withArena = snapshot.models.filter((model) => model.arena);
const withPrice = snapshot.models.filter((model) => model.price);
const recent = snapshot.models.slice(0, 40);
console.log(`Wrote ${OUTPUT}`);
console.log(`Epoch (as of ${epoch.asOf}): ${snapshot.models.length} models in the index; skills: ${snapshot.skills.map((skill) => `${skill.key} ${skill.entries.length}`).join(", ")}`);
console.log(`LMArena ${ARENA_CONFIG}/${ARENA_CATEGORY} (as of ${arena.asOf}, revision ${arena.revision.slice(0, 7)}): ${snapshot.arena.length} models; matched to Epoch: ${withArena.length}`);
console.log(`OpenRouter prices (as of ${snapshot.sources.openrouter.asOf}): matched to Epoch: ${withPrice.length}`);
console.log(`Matched to all three: ${snapshot.models.filter((model) => model.arena && model.price).length}`);
console.log(`Top 40 by index without an arena score: ${recent.filter((model) => !model.arena).map((model) => model.name).join("; ") || "none"}`);
console.log(`Top 40 by index without a price: ${recent.filter((model) => !model.price).map((model) => model.name).join("; ") || "none"}`);
console.log(`Top 40 arena models not matched to Epoch: ${snapshot.arena.slice(0, 40).filter((entry) => !entry.canonicalId).map((entry) => entry.name).join("; ") || "none"}`);
if (previous) console.log(`Previous snapshot: ${previous.generatedAt}`);
