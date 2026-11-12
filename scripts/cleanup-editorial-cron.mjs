import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
await run(process.execPath, [new URL("./cleanup-editorial-drafts.mjs", import.meta.url).pathname], { env: process.env });
