import { runEditorialDaily } from "../lib/editorial-daily-runner.mjs";
export default async function main({ log = console.log, error = console.error } = {}) { try { const result = await runEditorialDaily(); log(JSON.stringify(result)); return result; } catch (cause) { error(cause); throw cause; } }
