import assert from "node:assert/strict";
import test from "node:test";
import { questionPath, revalidateQuestionPath } from "../lib/question-revalidation-core.ts";

const valid = new Set(["source", "target"]);
test("successful source relation revalidation targets only the source question", () => { const paths: string[] = []; assert.equal(revalidateQuestionPath("source", valid, (path) => paths.push(path)), true); assert.deepEqual(paths, ["/questions/source"]); assert.equal(questionPath("target", valid), "/questions/target"); });
test("invalid slugs cannot produce arbitrary revalidation paths", () => { const paths: string[] = []; assert.equal(revalidateQuestionPath("../../admin", valid, (path) => paths.push(path)), false); assert.deepEqual(paths, []); });
test("revalidation failure does not throw or alter mutation outcome", () => { assert.equal(revalidateQuestionPath("source", valid, () => { throw new Error("cache unavailable"); }), false); });
