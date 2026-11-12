import { generateArticleDrafts } from "../editorial-article-ai.mjs";
export async function runDailyArticleDrafts({ count = 1, trendPack } = {}) { return generateArticleDrafts({ count, trendPack, autoPublish: true }); }
