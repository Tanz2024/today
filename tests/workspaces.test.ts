// Regression tests for the on-device AI workspaces' deterministic logic:
// rule-based writing checks, fact-preservation guards, diffing, citation
// formatting, keyword matching, retrieval/grounding, cloze items, PDF output
// and the model registry. None of these need a model or a network.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { applyFixes, lintText, readingEase } from "../lib/text/lint.ts";
import { addedNames, addedProtected, extractProtected, missingProtected } from "../lib/text/guard.ts";
import { diffWords } from "../lib/text/diff.ts";
import { formatCitation, extractDoi, toWork } from "../lib/text/citations.ts";
import { joinSegments, splitSegments, cleanRewrite, WRITING_MODES } from "../lib/writing/modes.ts";
import { matchTerms } from "../lib/resume/keywords.ts";
import { hasEvidence, rank, toPassages } from "../lib/study/retrieve.ts";
import { checkAnswer, isAbstention, parseCards, cardIsGrounded } from "../lib/study/grounding.ts";
import { clozeCards, keyTerms, markShortAnswer, toMcqs } from "../lib/study/cloze.ts";
import { buildImagePdf } from "../lib/pdf-writer.ts";
import { LLM_MODELS, planModel, type DeviceReport } from "../lib/local-llm/models.ts";
import { WORKSPACES } from "../lib/workspaces.ts";

const fixAll = (text: string) => { let t = text; for (let i = 0; i < 3; i += 1) t = applyFixes(t, lintText(t)); return t; };

test("rule-based checks fix unambiguous slips", () => {
  assert.equal(fixAll("their going too the libary on monday. i has a dog and he dont like cats , ok. We could of gone."), "They're going to the library on Monday. I have a dog and he doesn't like cats, ok. We could have gone.");
  assert.ok(lintText("This sentence is fine.").length === 0);
  assert.equal(readingEase("short"), null);
});

test("guard finds dropped and invented facts", () => {
  const kinds = extractProtected("Results (Smith et al., 2021) show 12.5% at [3]; see https://x.org and WebGPU q4_f16.").map((i) => `${i.kind}:${i.value}`);
  assert.deepEqual(kinds.sort(), ["citation:(Smith et al., 2021)", "citation:[3]", "link:https://x.org", "number:12.5%", "term:WebGPU", "term:q4_f16"].sort());
  assert.deepEqual(missingProtected("cost $42 million (Lee, 2020)", "cost 42 million").map((i) => i.value), ["(Lee, 2020)", "$42"]);
  assert.deepEqual(addedProtected(["Led a team of five"], "Led a team of 5, raising revenue 30%").map((i) => i.value), ["5", "30%"]);
  assert.deepEqual(addedNames(["Worked at acme"], "Worked at Acme using Kubernetes"), ["Kubernetes"]);
});

test("diff and segments round-trip", () => {
  assert.deepEqual(diffWords("the cat sat", "the dog sat").map((p) => p.type), ["same", "removed", "added", "same"]);
  const text = "First para.\n\nSecond para.";
  assert.equal(joinSegments(splitSegments(text)), text);
  assert.equal(cleanRewrite("Here is the corrected text:\n\nHello there."), "Hello there.");
  assert.ok(WRITING_MODES.every((mode) => mode.instruction.length > 20));
});

test("citations are formatted only from record fields", () => {
  assert.equal(extractDoi("https://doi.org/10.1038/nature14539."), "10.1038/nature14539");
  const work = toWork({ DOI: "10.1038/nature14539", title: ["Deep learning"], author: [{ given: "Yann", family: "LeCun" }, { given: "Yoshua", family: "Bengio" }, { given: "Geoffrey", family: "Hinton" }], issued: { "date-parts": [[2015, 5]] }, "container-title": ["Nature"], volume: "521", issue: "7553", page: "436-444", type: "journal-article" });
  assert.equal(formatCitation(work, "apa"), "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444. https://doi.org/10.1038/nature14539");
  const undated = toWork({ DOI: "10.1/x", title: ["T"] });
  assert.match(formatCitation(undated, "apa"), /\(n\.d\.\)/);
  assert.doesNotMatch(formatCitation(undated, "bibtex"), /year/);
});

test("keyword matching is deterministic and understands variants", () => {
  const jd = "Requirements: experience with React, TypeScript and GraphQL. Knowledge of CI/CD required. Experience with unit testing in Jest.";
  const result = Object.fromEntries(matchTerms("Built apps in React and TS. Wrote unit tests with Jest. Set up CI/CD.", jd).map((m) => [m.term, m.found]));
  assert.equal(result.React, true);
  assert.equal(result.TypeScript, true);
  assert.equal(result.GraphQL, false);
  assert.equal(result.Jest, true);
  assert.equal(result["unit testing"], true);
  assert.ok(!("CI" in result) && !("CD" in result));
});

const NOTES = "Photosynthesis takes place in the chloroplasts of plant cells. Chlorophyll absorbs mainly blue and red light.\n\nThe Calvin cycle occurs in the stroma of the chloroplast. It fixes carbon dioxide into glucose using ATP and NADPH from the light-dependent reactions, which occur in the thylakoid membranes.";

test("retrieval abstains without evidence and keeps passage numbers honest", () => {
  const passages = toPassages([{ page: null, text: NOTES }], 150);
  assert.ok(passages.every((p) => p.page === null));
  assert.ok(hasEvidence(rank(passages, "Where does the Calvin cycle occur?")));
  assert.ok(!hasEvidence(rank(passages, "Who won the 2018 World Cup?")));
  const checked = checkAnswer("The Calvin cycle occurs in the stroma [1]. It was discovered in 1950 [7].", [passages[1]]);
  assert.deepEqual(checked.cited, [1]);
  assert.deepEqual(checked.invalidCitations, [7]);
  assert.ok(isAbstention("NOT_IN_SOURCES"));
  assert.ok(isAbstention("The passages do not mention who discovered it."));
});

test("generated cards must match their passage", () => {
  const cards = parseCards('{"q":"Where does the Calvin cycle occur?","a":"In the stroma"}\nnot json\n{"q":"What does it fix?","a":"Nitrogen into proteins"}');
  assert.equal(cards.length, 2);
  assert.ok(cardIsGrounded(cards[0], NOTES));
  assert.ok(!cardIsGrounded(cards[1], NOTES));
  assert.equal(markShortAnswer("the stroma", "In the stroma"), "correct");
  assert.equal(markShortAnswer("mitochondria", "In the stroma"), "incorrect");
});

test("cloze quizzes use exact source terms", () => {
  const passages = toPassages([{ page: 3, text: fs.readFileSync(new URL("./fixtures/study-notes.txt", import.meta.url), "utf8") }]);
  const cards = clozeCards(passages);
  assert.ok(cards.length >= 5);
  for (const card of cards) assert.ok(passages.find((p) => p.id === card.passageId)!.text.includes(card.q.replace("_____", card.a)));
  const quiz = toMcqs(cards, keyTerms(passages));
  assert.ok(quiz.length >= 3);
  for (const q of quiz) { assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4); assert.equal(q.options[q.answer], cards.find((c) => `m-${c.id}` === q.id)!.a); }
});

test("image PDF writer produces a well-formed file", () => {
  const pdf = new TextDecoder("latin1").decode(buildImagePdf([{ jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 100, height: 140 }]));
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.match(pdf, /\/Count 1/);
  const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
  assert.ok(pdf.slice(xref).startsWith("xref"));
});

test("model registry plans honestly per device", () => {
  const base: DeviceReport = { webgpu: true, shaderF16: true, memoryGb: 8, cores: 8, mobile: false, maxBufferMb: 4096, workers: true, notes: [] };
  assert.deepEqual(planModel(LLM_MODELS["qwen3.5-2b"], base), { device: "webgpu", dtype: "q4f16", downloadMb: 1400 });
  assert.ok("unavailable" in planModel(LLM_MODELS["qwen3.5-2b"], { ...base, webgpu: false }));
  assert.deepEqual(planModel(LLM_MODELS["qwen3.5-0.8b"], { ...base, webgpu: false }), { device: "wasm", dtype: "q4", downloadMb: 665 });
  for (const model of Object.values(LLM_MODELS)) assert.equal(model.license, "Apache-2.0");
});

test("workspaces exist as routes, never call hosted AI routes, and are in the catalog order", () => {
  assert.deepEqual(WORKSPACES.map((w) => w.slug), ["ai-writing-studio", "ai-resume-assistant", "ai-image-document-studio", "ai-study-assistant"]);
  for (const workspace of WORKSPACES) assert.ok(fs.existsSync(`app/tools/${workspace.slug}/page.tsx`));
  const sources = [...fs.readdirSync("components/workspaces").map((f) => `components/workspaces/${f}`), ...fs.readdirSync("lib/local-llm").map((f) => `lib/local-llm/${f}`)];
  for (const file of sources) assert.doesNotMatch(fs.readFileSync(file, "utf8"), /\/api\/ai-|openrouter/i, file);
  const config = fs.readFileSync("next.config.ts", "utf8");
  for (const workspace of WORKSPACES) assert.ok(config.includes(`/tools/${workspace.slug}`));
});
