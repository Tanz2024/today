// TodayAI editorial taxonomy.
//
// Replaces the homepage's old keyword regex (which matched words like
// "digital", "tool" or "technology" anywhere in a title/description and so
// pulled lifestyle stories into "Latest AI news").
//
// Classification is deterministic and based on structured metadata only:
//   1. Explicit frontmatter wins: `aiTopic: "ai-at-work"` and
//      `contentType: "guide" | "news" | "explainer" | "review" | "comparison"`.
//   2. Otherwise an article is AI coverage only when an editor tagged it with an
//      AI-specific tag (see AI_TAGS). Body text and loose keywords are ignored.
//   3. The topic is chosen from ordered tag/title rules; if none match, the
//      article falls back to the neutral "Everyday AI" topic rather than being
//      forced into a more specific (and possibly wrong) one.
// Reviews and comparisons are never inferred: they must be declared in
// frontmatter, so a ratings-style page can't appear without editorial intent.
//
// Keep this file free of path aliases so the Node test runner can import it.

export type AiTopicSlug =
  | "ai-models"
  | "ai-companies"
  | "product-releases"
  | "research"
  | "robotics"
  | "ai-safety-policy"
  | "funding"
  | "creative-ai"
  | "ai-at-work"
  | "ai-education"
  | "everyday-ai";

export type AiTopic = { slug: AiTopicSlug; name: string; description: string };

export const AI_TOPICS: AiTopic[] = [
  { slug: "ai-models", name: "AI Models", description: "Language, image and multimodal models: what they can do and how they change." },
  { slug: "ai-companies", name: "AI Companies", description: "The labs, platforms and businesses shaping AI." },
  { slug: "product-releases", name: "Product Releases", description: "New AI products and features, and what they mean for users." },
  { slug: "research", name: "Research", description: "Studies, papers and findings explained without the jargon." },
  { slug: "robotics", name: "Robotics", description: "Robots, autonomy and AI in the physical world." },
  { slug: "ai-safety-policy", name: "AI Safety & Policy", description: "Deepfakes, misinformation, regulation and staying safe online." },
  { slug: "funding", name: "Funding", description: "Investment, deals and the money moving through AI." },
  { slug: "creative-ai", name: "Creative AI", description: "AI in art, music, video, writing and design." },
  { slug: "ai-at-work", name: "AI at Work", description: "Jobs, careers, skills and how AI is changing work." },
  { slug: "ai-education", name: "AI & Education", description: "Studying, teaching and academic integrity with AI." },
  { slug: "everyday-ai", name: "Everyday AI", description: "How people actually use AI in daily life." },
];

export type ContentType = "news" | "guide" | "explainer" | "review" | "comparison";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news: "News",
  guide: "Guide",
  explainer: "Explainer",
  review: "Review",
  comparison: "Comparison",
};

// Lower-cased tags that, by themselves, mark an article as AI coverage.
export const AI_TAGS = new Set([
  "ai",
  "ai tools",
  "artificial intelligence",
  "generative ai",
  "machine learning",
  "chatgpt",
  "claude",
  "gemini",
  "llm",
  "llms",
  "deepfakes",
  "ai safety",
  "ai policy",
  "robotics",
]);

type TopicRule = { topic: AiTopicSlug; tags?: string[]; title?: RegExp };

// Order matters: the first matching rule wins.
const TOPIC_RULES: TopicRule[] = [
  { topic: "ai-safety-policy", tags: ["online safety", "deepfakes", "misinformation", "ai safety", "ai policy", "regulation"], title: /\b(deepfake|ai-generated|regulat|safety)\b/i },
  { topic: "ai-education", tags: ["academic integrity", "study tips", "school", "university", "education"], title: /\b(study|studying|teacher|teachers|homework|exam)\b/i },
  { topic: "ai-at-work", tags: ["future of work", "careers", "jobs", "workplace", "productivity"], title: /\b(job|jobs|career|careers|work)\b/i },
  { topic: "robotics", tags: ["robotics", "robots"] },
  { topic: "funding", tags: ["funding", "investment", "venture capital"] },
  { topic: "research", tags: ["research", "study", "paper"] },
  { topic: "creative-ai", tags: ["creative ai", "ai art", "ai music", "ai video"] },
  { topic: "product-releases", tags: ["product launch", "product release", "launch"] },
  { topic: "ai-companies", tags: ["openai", "anthropic", "google deepmind", "ai companies"] },
  { topic: "ai-models", tags: ["llm", "llms", "ai models", "language models"] },
];

export type ClassifiableArticle = {
  title: string;
  tags?: string[];
  aiTopic?: string;
  contentType?: string;
};

const TOPIC_SLUGS = new Set<string>(AI_TOPICS.map((topic) => topic.slug));
const CONTENT_TYPES = new Set<string>(Object.keys(CONTENT_TYPE_LABELS));

function lowerTags(article: ClassifiableArticle) {
  return (article.tags ?? []).map((tag) => tag.trim().toLowerCase());
}

export function isAiArticle(article: ClassifiableArticle): boolean {
  if (article.aiTopic && TOPIC_SLUGS.has(article.aiTopic)) return true;
  return lowerTags(article).some((tag) => AI_TAGS.has(tag));
}

export function classifyAiTopic(article: ClassifiableArticle): AiTopicSlug | null {
  if (!isAiArticle(article)) return null;
  if (article.aiTopic && TOPIC_SLUGS.has(article.aiTopic)) return article.aiTopic as AiTopicSlug;
  const tags = lowerTags(article);
  for (const rule of TOPIC_RULES) {
    if (rule.tags?.some((tag) => tags.includes(tag))) return rule.topic;
  }
  for (const rule of TOPIC_RULES) {
    if (rule.title?.test(article.title)) return rule.topic;
  }
  return "everyday-ai";
}

export function classifyContentType(article: ClassifiableArticle): ContentType {
  if (article.contentType && CONTENT_TYPES.has(article.contentType)) return article.contentType as ContentType;
  if (/^how to\b/i.test(article.title.trim())) return "guide";
  if (/\?\s*$/.test(article.title.trim()) || /^(what|why|can|is|are|does|do)\b/i.test(article.title.trim())) return "explainer";
  // Reviews/comparisons are declared explicitly, never inferred.
  return "news";
}

export function getAiTopic(slug: string): AiTopic | undefined {
  return AI_TOPICS.find((topic) => topic.slug === slug);
}
