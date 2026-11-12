import assert from "node:assert/strict";
import test from "node:test";
import { handleRecommendationsRequest } from "../lib/question-recommendations-route-core.ts";

test("unknown question returns 404", async () => { assert.equal((await handleRecommendationsRequest("missing", { questionExists: () => false, getRecommendations: async () => [] })).status, 404); });
test("valid and empty recommendation responses return 200", async () => { const result = await handleRecommendationsRequest("q", { questionExists: () => true, getRecommendations: async () => [] }); assert.equal(result.status, 200); assert.deepEqual(result.body, []); });
test("backend failures return a safe 503", async () => { const result = await handleRecommendationsRequest("q", { questionExists: () => true, getRecommendations: async () => { throw new Error("private failure"); } }); assert.equal(result.status, 503); assert.deepEqual(result.body, { error: "Recommendations are temporarily unavailable." }); });
