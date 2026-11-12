import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/reactions/[slug]/route.ts", import.meta.url), "utf8");
const reactions = readFileSync(new URL("../lib/reactions.ts", import.meta.url), "utf8");

test("reaction writes return success only after persistence", () => {
  assert.match(route, /if \(!counts\)[\s\S]*status: 503/);
  assert.match(route, /return NextResponse\.json\(\{ counts, persisted: true \}\)/);
  assert.doesNotMatch(route, /counts: counts \?\?/);
});

test("unexpected reaction persistence failures are not silently converted to success", () => {
  assert.match(reactions, /if \(isAppwriteDatabaseUnavailable\(err\)\) return null;/);
  assert.match(reactions, /console\.error\(\"\[freshscene\] failed to adjust reaction\", err\);\n    throw err;/);
  assert.match(route, /status: 500/);
});
