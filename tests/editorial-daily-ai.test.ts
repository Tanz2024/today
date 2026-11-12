import test from "node:test";
import assert from "node:assert/strict";
import { malaysiaTheme, validateDailyGeneration } from "../lib/editorial-daily-ai.mjs";

const valid = { topic: "matcha", pulse: { question: "Worth it?", options: ["Worth it", "Robbery"] }, trivia: { question: "What is green?", options: ["Chlorophyll", "Sugar"], correctAnswer: "Chlorophyll", explanation: "It gives leaves their colour." }, groupChat: { question: "What did you buy?" }, thisOrThat: { left: "Matcha", right: "Coffee" }, dailyDropQuestion: "Have you tried matcha?", realQuestion: "Would you try matcha?" };

test("Malaysia theme rotates Monday through Sunday", () => {
  assert.equal(malaysiaTheme(new Date("2026-09-21T00:00:00+08:00")), "work, campus & starting the week");
  assert.equal(malaysiaTheme(new Date("2026-09-27T00:00:00+08:00")), "music, movies, anime & entertainment");
});

test("daily generation validation rejects malformed and repeated content", () => {
  assert.equal(validateDailyGeneration(valid, { trends: [{ title: "matcha products", summary: "matcha" }] as never[] }).valid, true);
  assert.equal(validateDailyGeneration({ ...valid, trivia: { ...valid.trivia, options: ["Only one"] } }).valid, false);
  assert.equal(validateDailyGeneration(valid, { previousQuestions: ["Worth it?"] as never[] }).valid, false);
});

test("unsafe content is rejected", () => {
  assert.equal(validateDailyGeneration({ ...valid, topic: "medical diagnosis" }).valid, false);
});
