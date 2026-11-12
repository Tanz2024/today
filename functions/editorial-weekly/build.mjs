import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.cwd(), "../..");
await mkdir("lib", { recursive: true });
await copyFile(path.join(root, "lib/editorial-weekly-runner.mjs"), "lib/editorial-weekly-runner.mjs");
await copyFile(path.join(root, "lib/editorial-providers.mjs"), "lib/editorial-providers.mjs");
await copyFile(path.join(root, "lib/editorial-weekly-question.mjs"), "lib/editorial-weekly-question.mjs");
console.log("Prepared self-contained editorial-weekly runtime files.");
