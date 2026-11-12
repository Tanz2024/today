// AI Tools Directory data.
//
// Editorial rules for this file (keep them, they protect readers):
// - Only list real, publicly available products with their official website.
// - Descriptions are neutral and factual: what the product is for, not how good
//   it is. No scores, rankings or endorsements.
// - `pricing` stays null unless an editor has checked the official pricing page;
//   set `pricingVerifiedOn` when you fill it in.
// - `affiliate` is false unless a signed affiliate agreement exists. When it is
//   true the directory shows a disclosure next to the link.
// - `lastVerified` is the date the official URL was checked as live.
// - `relatedArticles` must point at real TodayAI article paths.
//
// The practical calculators at /tools are TodayAI's own utilities and are NOT
// AI products; they are listed by lib/practical-tools.ts.

export type AiToolCategorySlug =
  | "writing"
  | "coding"
  | "research"
  | "image"
  | "video"
  | "audio"
  | "productivity"
  | "education";

export type AiToolCategory = { slug: AiToolCategorySlug; name: string; description: string };

export const AI_TOOL_CATEGORIES: AiToolCategory[] = [
  { slug: "writing", name: "AI Writing", description: "Drafting, editing, rewriting and translation." },
  { slug: "coding", name: "AI Coding", description: "Code completion, explanation and pair programming." },
  { slug: "research", name: "AI Research", description: "Search, source-backed answers and document analysis." },
  { slug: "image", name: "AI Image", description: "Generating and editing images and graphics." },
  { slug: "video", name: "AI Video", description: "Generating and editing video." },
  { slug: "audio", name: "AI Audio", description: "Voice, speech and music generation." },
  { slug: "productivity", name: "AI Productivity", description: "Notes, meetings, documents and everyday work." },
  { slug: "education", name: "AI Education", description: "Tutoring and learning support." },
];

export type AiTool = {
  slug: string;
  name: string;
  url: string;
  maker: string;
  category: AiToolCategorySlug;
  description: string;
  useCases: string[];
  /** Null until checked on the official pricing page. */
  pricing: string | null;
  pricingVerifiedOn?: string;
  affiliate: boolean;
  lastVerified: string;
  /** TodayAI article paths, e.g. "/campus/can-teachers-detect-chatgpt". */
  relatedArticles?: string[];
  /** TodayAI review/comparison paths, once published. */
  relatedReviews?: string[];
};

const VERIFIED = "2026-11-12";

export const AI_TOOLS: AiTool[] = [
  { slug: "chatgpt", name: "ChatGPT", maker: "OpenAI", url: "https://chatgpt.com", category: "writing", description: "General-purpose AI assistant for conversation, drafting, summarising and answering questions.", useCases: ["Drafting and rewriting", "Explaining concepts", "Brainstorming"], pricing: null, affiliate: false, lastVerified: VERIFIED, relatedArticles: ["/campus/can-teachers-detect-chatgpt", "/campus/how-to-use-ai-for-studying"] },
  { slug: "grammarly", name: "Grammarly", maker: "Grammarly", url: "https://www.grammarly.com", category: "writing", description: "Writing assistant that checks grammar, clarity and tone, with AI rewriting features.", useCases: ["Proofreading", "Tone adjustment", "Rewriting sentences"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "deepl", name: "DeepL Translator", maker: "DeepL", url: "https://www.deepl.com/translator", category: "writing", description: "Machine translation for text and documents across many languages.", useCases: ["Translating text", "Translating documents"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "github-copilot", name: "GitHub Copilot", maker: "GitHub", url: "https://github.com/features/copilot", category: "coding", description: "AI coding assistant that suggests code and answers questions inside editors and on GitHub.", useCases: ["Code completion", "Explaining code", "Writing tests"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "cursor", name: "Cursor", maker: "Anysphere", url: "https://cursor.com", category: "coding", description: "Code editor built around AI-assisted editing, chat and codebase search.", useCases: ["Editing code with AI", "Navigating large codebases"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "perplexity", name: "Perplexity", maker: "Perplexity AI", url: "https://www.perplexity.ai", category: "research", description: "AI answer engine that searches the web and shows the sources behind its answers.", useCases: ["Researching a topic", "Finding sources"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "notebooklm", name: "NotebookLM", maker: "Google", url: "https://notebooklm.google", category: "research", description: "Research notebook that answers questions grounded in the documents you upload.", useCases: ["Summarising documents", "Studying from your own notes"], pricing: null, affiliate: false, lastVerified: VERIFIED, relatedArticles: ["/campus/how-to-use-ai-for-studying"] },
  { slug: "gemini", name: "Gemini", maker: "Google", url: "https://gemini.google.com", category: "research", description: "Google's AI assistant for questions, writing help and working with Google apps.", useCases: ["Answering questions", "Drafting", "Planning"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "canva-ai-image", name: "Canva AI image generator", maker: "Canva", url: "https://www.canva.com/ai-image-generator/", category: "image", description: "Text-to-image generation inside Canva's design editor.", useCases: ["Social graphics", "Presentation visuals"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "runway", name: "Runway", maker: "Runway", url: "https://runwayml.com", category: "video", description: "AI video generation and editing tools for creators and studios.", useCases: ["Generating video clips", "Video editing effects"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "elevenlabs", name: "ElevenLabs", maker: "ElevenLabs", url: "https://elevenlabs.io", category: "audio", description: "AI voice generation, text-to-speech and dubbing.", useCases: ["Text-to-speech", "Voiceovers", "Dubbing"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "suno", name: "Suno", maker: "Suno", url: "https://suno.com", category: "audio", description: "Generates songs, with vocals and instruments, from text prompts.", useCases: ["Music generation", "Song sketches"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "notion-ai", name: "Notion AI", maker: "Notion", url: "https://www.notion.com/product/ai", category: "productivity", description: "AI features inside Notion for writing, summarising and searching your workspace.", useCases: ["Summarising notes", "Drafting docs", "Workspace Q&A"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "otter", name: "Otter.ai", maker: "Otter.ai", url: "https://otter.ai", category: "productivity", description: "Meeting transcription with AI-generated summaries and notes.", useCases: ["Transcribing meetings", "Lecture notes"], pricing: null, affiliate: false, lastVerified: VERIFIED },
  { slug: "khanmigo", name: "Khanmigo", maker: "Khan Academy", url: "https://www.khanmigo.ai", category: "education", description: "AI tutor and teaching assistant from Khan Academy.", useCases: ["Guided tutoring", "Lesson planning for teachers"], pricing: null, affiliate: false, lastVerified: VERIFIED, relatedArticles: ["/campus/how-to-use-ai-for-studying"] },
];

export function getAiToolsByCategory(slug: AiToolCategorySlug) {
  return AI_TOOLS.filter((tool) => tool.category === slug);
}

export function getAiToolCategory(slug: string) {
  return AI_TOOL_CATEGORIES.find((category) => category.slug === slug);
}
