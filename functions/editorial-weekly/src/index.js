import { runEditorialWeekly } from "../lib/editorial-weekly-runner.mjs";
export default async function main({ log = console.log, error = console.error } = {}) { try { const result = await runEditorialWeekly(); log(JSON.stringify(result)); return result; } catch (cause) { error(cause); throw cause; } }
