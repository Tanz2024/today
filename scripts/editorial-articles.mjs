import { generateArticleDrafts } from "../lib/editorial-article-ai.mjs";

const args = new Set(process.argv.slice(2));
const countArg = process.argv.find((value) => value.startsWith("--count="));
const count = Math.max(1, Math.min(2, Number(countArg?.split("=")[1] ?? 2)));
const result = await generateArticleDrafts({ count, dryRun: args.has("--dry-run") });
console.log(JSON.stringify(result, null, 2));
