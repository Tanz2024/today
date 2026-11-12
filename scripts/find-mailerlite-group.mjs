// Read-only lookup: finds the MailerLite group ID for "The Fresh Drop".
// Never creates, modifies, or deletes anything. Run with:
//   node scripts/find-mailerlite-group.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(rootDir, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const TARGET_GROUP_NAME = "The Fresh Drop";

async function main() {
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error("[find-mailerlite-group] MAILERLITE_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const res = await fetch("https://connect.mailerlite.com/api/groups?limit=100", {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[find-mailerlite-group] MailerLite API request failed with status ${res.status}`);
    process.exit(1);
  }

  const { data: groups = [] } = await res.json();
  console.log(`[find-mailerlite-group] Found ${groups.length} group(s):`);
  for (const group of groups) {
    console.log(`  - "${group.name}" (id: ${group.id})`);
  }

  const match = groups.find((g) => g.name === TARGET_GROUP_NAME);
  if (!match) {
    console.error(`\n[find-mailerlite-group] No group named exactly "${TARGET_GROUP_NAME}" was found.`);
    console.error("Create it in MailerLite first, or tell me the exact existing group name to use instead.");
    process.exit(1);
  }

  console.log(`\n[find-mailerlite-group] Match: "${TARGET_GROUP_NAME}" -> MAILERLITE_GROUP_ID=${match.id}`);
  console.log("Add that to .env.local and Vercel.");
}

main().catch((err) => {
  console.error("[find-mailerlite-group] Lookup failed:", err);
  process.exit(1);
});
