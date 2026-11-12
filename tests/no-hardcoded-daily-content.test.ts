import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("production daily resolvers contain no temporary current-question overrides", () => {
  const sources = ["app/page.tsx", "app/pulse/page.tsx", "lib/editorial-content.ts", "lib/editorial-daily-runner.mjs"]
    .map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const phrase of ["September Lock-In", "Are you actually locking in", "Spotify or Apple Music", "Streaming on Netflix", "What’s something you’ve completely changed"]) {
    assert.equal(sources.includes(phrase), false, `hardcoded daily content found: ${phrase}`);
  }
});
