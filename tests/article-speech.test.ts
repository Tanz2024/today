import test from "node:test";
import assert from "node:assert/strict";
import { articleSpeechParagraphs, markdownToSpeechParagraphs, pickReadingVoice, speechChunks } from "../lib/article-speech.ts";

const voice = (name: string, lang = "en-US", localService = true) => ({ name, lang, localService });

test("a female English voice is chosen over male ones (Windows voice set)", () => {
  const voices = ["Microsoft George - English (United Kingdom)", "Microsoft David - English (United States)", "Microsoft Mark - English (United States)", "Microsoft Zira - English (United States)"].map((name) => voice(name));
  assert.match(pickReadingVoice(voices)!.name, /Zira/);
});

test("natural female voices beat standard female voices", () => {
  const voices = [voice("Microsoft Zira - English (United States)"), voice("Microsoft Aria Online (Natural) - English (United States)", "en-US", false), voice("Microsoft Guy Online (Natural) - English (United States)", "en-US", false)];
  assert.match(pickReadingVoice(voices)!.name, /Aria/);
});

test("Google UK English Female is female and Google UK English Male is not", () => {
  assert.match(pickReadingVoice([voice("Google UK English Male", "en-GB", false), voice("Google UK English Female", "en-GB", false)])!.name, /Female/);
});

test("with no known female voice, a known male voice is avoided", () => {
  assert.equal(pickReadingVoice([voice("Microsoft David"), voice("Some Voice")])!.name, "Some Voice");
});

test("English voices are preferred over other languages", () => {
  assert.equal(pickReadingVoice([voice("Amélie", "fr-CA"), voice("Microsoft Hazel", "en-GB")])!.name, "Microsoft Hazel");
});

test("markdown syntax, code, images and components are not read aloud", () => {
  const md = [
    'import X from "y"',
    "",
    "## Before you start",
    "",
    "Use **Node.js 18** or newer. See [the docs](https://example.com/docs) and file_name_here.",
    "",
    "![screenshot](/img.png)",
    "",
    "```bash",
    "npm install -g thing",
    "```",
    "",
    "<Callout>Heads up: run *this* first.</Callout>",
    "",
    "<ReadNext />",
    "",
    "| Tool | Price |",
    "|------|-------|",
    "| Claude | Free |",
    "",
    "- First item",
    "- Second item with `code`",
  ].join("\n");
  assert.deepEqual(markdownToSpeechParagraphs(md), [
    "Before you start",
    "Use Node.js 18 or newer. See the docs and file_name_here.",
    "Heads up: run this first.",
    "Tool, Price.",
    "Claude, Free.",
    "First item",
    "Second item with code",
  ]);
});

test("Windows line endings keep paragraphs apart", () => {
  assert.deepEqual(markdownToSpeechParagraphs("## One\r\n\r\nFirst paragraph.\r\n\r\nSecond paragraph."), ["One", "First paragraph.", "Second paragraph."]);
});

test("listeners hear the headline and summary first", () => {
  assert.deepEqual(articleSpeechParagraphs({ title: "Title", description: "Summary.", content: "Body text." }), ["Title", "Summary.", "Body text."]);
});

test("chunks stay short, break at sentences and keep their paragraph", () => {
  const long = "This is a sentence that keeps going. ".repeat(20);
  const chunks = speechChunks([long, "Short one."]);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 220));
  assert.ok(chunks.slice(0, -1).every((chunk) => chunk.text.endsWith(".")));
  assert.deepEqual(chunks.at(-1), { text: "Short one.", paragraph: 1 });
  const noStops = speechChunks(["word ".repeat(120)]);
  assert.ok(noStops.length > 1 && noStops.every((chunk) => chunk.text.length <= 220));
});
