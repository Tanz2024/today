// Decision guides for /compare.
//
// Editorial rules (same as lib/ai-tools.ts):
// - Every statement describes what a product is documented to do on its
//   official site, not how well it does it. No scores, rankings, benchmarks,
//   prices or "winner" labels.
// - "Look elsewhere if" notes describe scope (what the product is not built
//   for), never quality.
// - Re-check against official sites when `lastVerified` in ai-tools.ts moves.

import type { AiToolCategorySlug } from "@/lib/ai-tools";

export type CompareBranch = {
  /** The answer the reader picks at the decision point. */
  answer: string;
  /** Tool slugs from lib/ai-tools.ts this answer leads to. */
  tools: string[];
  /** Why this answer leads there, in one factual sentence. */
  because: string;
};

export type ToolAnalysis = {
  bestFor: string;
  differs: string;
  lookElsewhere: string;
};

export type CompareGuide = {
  /** The first question a reader should ask themselves. */
  question: string;
  branches: CompareBranch[];
  /** The one distinction that matters most in this category. */
  keyDifference: string;
};

export const COMPARE_GUIDES: Partial<Record<AiToolCategorySlug, CompareGuide>> = {
  chatbots: {
    question: "What do you mainly need the assistant for?",
    keyDifference: "The biggest split is between general assistants that answer from a model (and can search when asked) and tools built around one job: showing web sources, or tutoring without handing over answers.",
    branches: [
      { answer: "General questions, drafting and brainstorming", tools: ["chatgpt", "gemini"], because: "Both are general-purpose assistants for writing, questions and planning." },
      { answer: "Research where I need to see the sources", tools: ["perplexity"], because: "Perplexity searches the web for each answer and lists the sources it used." },
      { answer: "I already work in Google apps", tools: ["gemini"], because: "Gemini is Google's assistant and connects to Google apps." },
      { answer: "Learning or teaching", tools: ["khanmigo"], because: "Khanmigo is Khan Academy's tutor and teaching assistant." },
    ],
  },
  coding: {
    question: "Do you want to keep your current code editor?",
    keyDifference: "GitHub Copilot is an assistant you add to the editor you already use; Cursor is a separate code editor with AI built in.",
    branches: [
      { answer: "Yes — add AI to my existing editor", tools: ["github-copilot"], because: "Copilot installs as an extension in popular editors and also works on GitHub." },
      { answer: "No — I'm happy to switch editors", tools: ["cursor"], because: "Cursor is its own editor designed around AI chat, editing and codebase search." },
    ],
  },
  productivity: {
    question: "What is the text you want help with?",
    keyDifference: "These tools aren't really competitors: each works on a different kind of material — your writing, a foreign-language text, your documents, your workspace or a recorded meeting.",
    branches: [
      { answer: "My own writing — grammar, clarity, tone", tools: ["grammarly"], because: "Grammarly checks and rewrites text as you write." },
      { answer: "Text in another language", tools: ["deepl"], because: "DeepL translates text and whole documents." },
      { answer: "Documents and notes I want to study or question", tools: ["notebooklm"], because: "NotebookLM answers using only the sources you upload." },
      { answer: "Pages already in my Notion workspace", tools: ["notion-ai"], because: "Notion AI works inside Notion on the content already there." },
      { answer: "Meetings or lectures", tools: ["otter"], because: "Otter.ai transcribes speech and summarises meetings." },
    ],
  },
  creative: {
    question: "What do you want to create?",
    keyDifference: "Pick by output type first: image, video, voice or music. Each product here focuses on one medium.",
    branches: [
      { answer: "Images for designs and social posts", tools: ["canva-ai-image"], because: "Canva generates images directly inside its design editor." },
      { answer: "Video clips or video effects", tools: ["runway"], because: "Runway focuses on AI video generation and editing." },
      { answer: "Voiceovers, speech or dubbing", tools: ["elevenlabs"], because: "ElevenLabs focuses on text-to-speech, voices and dubbing." },
      { answer: "Songs and music", tools: ["suno"], because: "Suno generates full songs, including vocals, from a text prompt." },
    ],
  },
};

export const TOOL_ANALYSIS: Record<string, ToolAnalysis> = {
  chatgpt: { bestFor: "An all-round assistant for writing, questions and planning.", differs: "General-purpose; covers the widest range of everyday tasks in one chat.", lookElsewhere: "You need every answer tied to visible web sources by default." },
  gemini: { bestFor: "People who live in Google's apps.", differs: "Made by Google and connects to Google apps.", lookElsewhere: "You don't use Google services and just want a general chat assistant — any of the general assistants will do." },
  perplexity: { bestFor: "Quick research with sources you can check.", differs: "Built as an answer engine: searches the web and lists sources with each answer.", lookElsewhere: "You mostly need long-form drafting or creative writing." },
  khanmigo: { bestFor: "Students and teachers.", differs: "A tutor from Khan Academy aimed at guided learning and lesson planning.", lookElsewhere: "You want a general assistant for work tasks." },
  "github-copilot": { bestFor: "Developers who want to keep their editor.", differs: "Extension for existing editors, plus features on GitHub itself.", lookElsewhere: "You want an editor redesigned around AI rather than an add-on." },
  cursor: { bestFor: "Developers willing to switch to an AI-first editor.", differs: "A standalone editor with AI editing, chat and codebase search built in.", lookElsewhere: "Your team is tied to another editor or IDE." },
  grammarly: { bestFor: "Polishing your own writing.", differs: "Works on text as you write: grammar, clarity, tone and rewrites.", lookElsewhere: "You need to translate or summarise rather than edit." },
  deepl: { bestFor: "Translating text and documents.", differs: "Dedicated machine translation, including whole files.", lookElsewhere: "Your text is already in the right language and needs editing." },
  notebooklm: { bestFor: "Studying or questioning a set of documents.", differs: "Grounds answers in the sources you upload rather than the open web.", lookElsewhere: "You need answers about things not in your documents." },
  "notion-ai": { bestFor: "Teams whose notes and docs already live in Notion.", differs: "Works inside the Notion workspace on content already there.", lookElsewhere: "You don't use Notion." },
  otter: { bestFor: "Meetings and lectures.", differs: "Turns recorded speech into transcripts and summaries.", lookElsewhere: "Your material is written, not spoken." },
  "canva-ai-image": { bestFor: "Quick visuals that go straight into a design.", differs: "Image generation lives inside Canva's editor, next to templates and layout tools.", lookElsewhere: "You need video, audio or a standalone image model." },
  runway: { bestFor: "Video creators.", differs: "Focused on generating and editing video.", lookElsewhere: "You only need still images or audio." },
  elevenlabs: { bestFor: "Voiceovers, narration and dubbing.", differs: "Focused on speech: text-to-speech, voices and dubbing.", lookElsewhere: "You want music rather than speech." },
  suno: { bestFor: "Song ideas and music sketches.", differs: "Generates complete songs, including vocals, from a prompt.", lookElsewhere: "You need spoken narration rather than music." },
};
