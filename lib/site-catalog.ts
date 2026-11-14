// One discovery catalog for TodayAI's own utilities and games.
//
// The homepage, /tools, /play, search and article "related" blocks all read
// from here so names, descriptions and categories cannot drift. Only list
// things that actually exist as routes in app/. No ratings, play counts or
// popularity claims: none of that data exists.
import { AI_UTILITIES } from "./ai-utilities.ts";
import { LOCAL_AI_TOOLS } from "./local-ai-tools.ts";
import { WORKSPACES } from "./workspaces.ts";

export type ToolCategorySlug = "images" | "writing" | "audio" | "documents" | "coding" | "productivity" | "creative";
// Shown only when at least one tool is in the category (see toolCategoriesInUse).
export const TOOL_CATEGORIES: { slug: ToolCategorySlug; name: string }[] = [
  { slug: "images", name: "Images" },
  { slug: "writing", name: "Writing" },
  { slug: "audio", name: "Audio" },
  { slug: "documents", name: "Documents" },
  { slug: "coding", name: "Developer" },
  { slug: "productivity", name: "Productivity" },
  { slug: "creative", name: "Creative" },
];

export type CatalogTool = {
  title: string;
  href: string;
  description: string;
  category: ToolCategorySlug;
  /** "ai" tools need the hosted model (server switch); "local" tools run in the browser. */
  kind: "ai" | "local";
  /** Runs an AI model on the visitor's device. */
  onDevice?: boolean;
  /** Short card line and model chip (everyday AI tools). */
  tagline?: string;
  model?: string;
  featured?: boolean;
  keywords?: string[];
};

// The five everyday AI tools, in homepage order.
export const EVERYDAY_AI_TOOL_HREFS = ["/tools/ai-background-remover", "/tools/ai-grammar-rewriter", "/tools/ai-speech-to-text", "/tools/ai-pdf-assistant", "/tools/ai-image-to-text"];

export const CATALOG_TOOLS: CatalogTool[] = [
  // On-device AI workspaces (no hosted model; see lib/local-llm).
  ...WORKSPACES.map((workspace) => ({
    title: workspace.name,
    href: `/tools/${workspace.slug}`,
    description: workspace.description,
    category: workspace.category,
    kind: "local" as const,
    onDevice: true,
    tagline: workspace.tagline,
    model: workspace.model,
    featured: true,
    keywords: workspace.keywords,
  })),
  ...LOCAL_AI_TOOLS.map((tool) => ({
    title: tool.name,
    href: `/tools/${tool.slug}`,
    description: tool.description,
    category: tool.category,
    // The PDF assistant extracts locally but needs the hosted model to answer.
    kind: tool.processing === "device" ? ("local" as const) : ("ai" as const),
    onDevice: tool.processing === "device",
    tagline: tool.tagline,
    model: tool.model,
    featured: true,
    keywords: tool.keywords,
  })),
  ...AI_UTILITIES.map((tool) => ({
    title: tool.name,
    href: `/tools/${tool.slug}`,
    description: tool.description,
    category: tool.category,
    kind: "ai" as const,
    featured: tool.featured,
    keywords: tool.keywords,
    ...(tool.slug === "ai-grammar-rewriter" ? { tagline: "Fix and rewrite text", model: "LLM via OpenRouter" } : {}),
  })),
  // Kept: a writing aid for checking AI-drafted text against length limits.
  { title: "Word & Character Counter", href: "/tools/word-counter", description: "Count words, characters and reading time for drafts and AI output. Runs on your device.", category: "writing", kind: "local", keywords: ["count", "characters", "length"] },
];

export function toolCategoriesInUse() {
  return TOOL_CATEGORIES.filter((category) => CATALOG_TOOLS.some((tool) => tool.category === category.slug));
}

export type GameCategorySlug = "word" | "drawing" | "puzzle" | "challenge";
export const GAME_CATEGORIES: { slug: GameCategorySlug; name: string }[] = [
  { slug: "word", name: "AI Word Games" },
  { slug: "puzzle", name: "AI Puzzle Games" },
  { slug: "drawing", name: "AI Drawing Games" },
  { slug: "challenge", name: "AI Challenges" },
];

export type CatalogGame = {
  slug: string;
  title: string;
  href: string;
  description: string;
  category: GameCategorySlug;
  /** Image under /public; games without one get a typographic tile. */
  thumbnail?: string;
  /** Short label such as play length. */
  meta: string;
  featured?: boolean;
  /** Has a daily rotation (same puzzle for everyone each day). */
  daily?: boolean;
  keywords?: string[];
};

export const CATALOG_GAMES: CatalogGame[] = [
  { slug: "word-detective", title: "AI Word Detective", href: "/play/word-detective", description: "Find the secret word. A language model scores how close each guess is in meaning.", category: "word", meta: "Daily puzzle · 2–5 min", featured: true, daily: true, keywords: ["semantic", "embedding", "word", "guess", "language model", "puzzle"] },
  { slug: "quick-draw", title: "AI Draw & Guess", href: "/play/quick-draw", description: "Draw a prompt before the timer runs out while an image-recognition model guesses your sketch.", category: "drawing", meta: "1 min", featured: true, keywords: ["quick draw", "drawing", "recognition", "sketch"] },
];

export function getGame(slug: string) {
  return CATALOG_GAMES.find((game) => game.slug === slug);
}

export function relatedGames(slug: string, count = 3) {
  const game = getGame(slug);
  const same = CATALOG_GAMES.filter((item) => item.slug !== slug && item.category === game?.category);
  const rest = CATALOG_GAMES.filter((item) => item.slug !== slug && item.category !== game?.category);
  return [...same, ...rest].slice(0, count);
}

export function relatedTools(href: string, count = 3) {
  const tool = CATALOG_TOOLS.find((item) => item.href === href);
  const same = CATALOG_TOOLS.filter((item) => item.href !== href && item.category === tool?.category);
  const rest = CATALOG_TOOLS.filter((item) => item.href !== href && item.category !== tool?.category);
  return [...same, ...rest].slice(0, count);
}

/**
 * Contextual links from an article to a TodayAI tool or game. Matching is on
 * the article's own title/tags, so an unrelated story gets nothing rather
 * than a generic link list.
 */
const CONTEXT_RULES: { pattern: RegExp; href: string }[] = [
  { pattern: /\bocr\b|\bscreenshots?\b|\bimage to text\b/i, href: "/tools/ai-image-to-text" },
  { pattern: /\btranscri(be|bing|ption)\b|\bwhisper\b|\bspeech[- ]to[- ]text\b|\bvoice notes?\b/i, href: "/tools/ai-speech-to-text" },
  { pattern: /\bexams?\b|\brevision\b|\bflashcards?\b|\bstudy(ing)?\b/i, href: "/tools/ai-study-assistant" },
  { pattern: /\bresumes?\b|\bcvs?\b|\bcover letters?\b|\bjob (search|application)s?\b/i, href: "/tools/ai-resume-assistant" },
  { pattern: /\bpdfs?\b/i, href: "/tools/ai-pdf-assistant" },
  { pattern: /\bgrammar\b|\bproofread(ing)?\b|\bparaphras(e|ing)\b|\brewrit(e|ing)\b/i, href: "/tools/ai-writing-studio" },
  { pattern: /\bbackground remov(al|er)\b|\bremove (the )?background\b/i, href: "/tools/ai-background-remover" },
  { pattern: /\bsummar(y|ise|ize|ising|izing|ies)\b|\bnotebooklm\b|\bdocuments?\b|\bnote[- ]taking\b|\bstudying\b/i, href: "/tools/ai-text-summarizer" },
  { pattern: /\bprompts?\b|\bprompting\b|\bchatgpt\b|\bclaude\b|\bgemini\b/i, href: "/tools/ai-prompt-improver" },
  { pattern: /\bcod(e|ing)\b|\bprogramm(ing|er)\b|\bdeveloper\b|\bcopilot\b|\bcursor\b/i, href: "/tools/ai-code-explainer" },
  { pattern: /\bembeddings?\b|\bsemantic\b|\bword games?\b|\blanguage models?\b/i, href: "/play/word-detective" },
  { pattern: /\bemails?\b|\binbox\b/i, href: "/tools/ai-email-writer" },
  { pattern: /\bautomat(e|ion|ing)\b|\bworkflows?\b|\bzapier\b|\bn8n\b/i, href: "/tools/ai-workflow-generator" },
  { pattern: /\bimage recognition\b|\bcomputer vision\b|\bclassifier\b/i, href: "/play/quick-draw" },
];

export type ContextLink = { title: string; href: string; description: string; type: "Tool" | "Game" };

export function contextualLinksFor(text: string, limit = 2): ContextLink[] {
  const links: ContextLink[] = [];
  for (const rule of CONTEXT_RULES) {
    if (!rule.pattern.test(text)) continue;
    const tool = CATALOG_TOOLS.find((item) => item.href === rule.href);
    const game = CATALOG_GAMES.find((item) => item.href === rule.href);
    if (tool) links.push({ title: tool.title, href: tool.href, description: tool.description, type: "Tool" });
    else if (game) links.push({ title: game.title, href: game.href, description: game.description, type: "Game" });
    if (links.length >= limit) break;
  }
  return links;
}
