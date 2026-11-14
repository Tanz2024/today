import { generateArticleDrafts } from "../editorial-article-ai.mjs";

// Always creates drafts for human moderation (/story-review-7q4m9x); never
// auto-publishes unverified AI-written content. Not scheduled: the generator
// in lib/editorial-article-ai.mjs still targets the retired lifestyle desks
// and must be retargeted to AI coverage first.
export async function runDailyArticleDrafts({ count = 1, trendPack } = {}) { return generateArticleDrafts({ count, trendPack, autoPublish: false }); }
