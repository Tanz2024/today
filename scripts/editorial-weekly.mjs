import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { runEditorialWeekly } from "../lib/editorial-weekly-runner.mjs";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) { const i = line.indexOf("="); if (i > 0 && !line.trim().startsWith("#") && process.env[line.slice(0, i).trim()] === undefined) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
const providerArg = process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1];
console.log(JSON.stringify(await runEditorialWeekly({ dryRun: process.argv.includes("--dry-run"), providerArg }), null, 2));
