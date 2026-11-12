import test from "node:test";
import assert from "node:assert/strict";
import { handleQuestionReasonsGet, handleQuestionReasonsPost, type QuestionReasonsRouteDependencies } from "../lib/question-reasons-route-core.ts";

function deps(overrides: Partial<QuestionReasonsRouteDependencies<string>> = {}): QuestionReasonsRouteDependencies<string> {
  return { getQuestion: (slug) => slug === "known" ? { slug } : undefined, getQuestionPoll: () => ({ id: "poll-1", options: ["yes"] }), getVisitorId: () => "private-hash", getApprovedQuestionReasons: async () => [{ optionId: "yes", reason: "It fits." }], submitQuestionReason: async () => ({ ok: true }), ...overrides };
}

test("unknown question GET returns 404", async () => { assert.equal((await handleQuestionReasonsGet("unknown", deps())).status, 404); });
test("valid question GET returns only approved public fields", async () => { assert.deepEqual((await handleQuestionReasonsGet("known", deps())).body, { reasons: [{ optionId: "yes", reason: "It fits." }] }); });
test("unknown question POST returns 404 before visitor or storage calls", async () => { let called = false; const result = await handleQuestionReasonsPost("unknown", { optionId: "yes", reason: "x" }, "request", deps({ getVisitorId: () => { called = true; return "hash"; } })); assert.equal(result.status, 404); assert.equal(called, false); });
test("client status is ignored and accepted responses remain pending", async () => { const result = await handleQuestionReasonsPost("known", { optionId: "yes", reason: "x", status: "approved" }, "request", deps()); assert.deepEqual(result.body, { ok: true, status: "pending" }); });
test("invalid option is rejected before storage", async () => { const result = await handleQuestionReasonsPost("known", { optionId: "other", reason: "x" }, "request", deps()); assert.equal(result.status, 400); });
