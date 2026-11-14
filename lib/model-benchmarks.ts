// The committed benchmark snapshot behind /compare's ranked charts.
// Refresh it with `npm run models:update` (scripts/update-model-benchmarks.ts);
// it is read at build/render time and never fetched at runtime. The shape is
// checked before use: anything malformed is dropped so its chart is hidden.

import raw from "@/content/model-benchmarks.json";
import { validateSnapshot, type ModelBenchmarksSnapshot } from "@/lib/model-rankings";

export const modelBenchmarks: ModelBenchmarksSnapshot | null = validateSnapshot(raw);
