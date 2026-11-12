import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { runWeeklyFoodTravel } from "../lib/editorial-food-travel-ai.mjs";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) { const i = line.indexOf("="); if (i > 0 && !line.trim().startsWith("#") && process.env[line.slice(0, i).trim()] === undefined) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""); }
const beatParam = process.argv.find((arg) => arg.startsWith("--beat="))?.split("=")[1];
console.log(JSON.stringify(await runWeeklyFoodTravel({ dryRun: process.argv.includes("--dry-run"), beatParam }), null, 2));
