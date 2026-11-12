import test from "node:test";
import assert from "node:assert/strict";
import { MAX_RECENT_READS, readRecentArticles, rememberRecentArticle, deprioritizeRecentlyRead } from "../lib/recently-read.ts";

function storage() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) }; }
test("recent reads are capped and newest first", () => { const store = storage(); for (let i = 0; i < MAX_RECENT_READS + 4; i++) rememberRecentArticle(`story-${i}`, store); const items = readRecentArticles(store); assert.equal(items.length, MAX_RECENT_READS); assert.equal(items[0], `story-${MAX_RECENT_READS + 3}`); });
test("recent reads are deprioritized without being required", () => { const result = deprioritizeRecentlyRead([{ slug: "read" }, { slug: "new" }], ["read"]); assert.deepEqual(result.map((item) => item.slug), ["new", "read"]); });
