import "server-only";
import { cache } from "react";
import { selectAiArticles } from "@/lib/ai-content";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { buildTopicIndex } from "@/lib/topics";

// Built in memory from the shared catalogue: no per-topic Appwrite queries.
// Tag hubs are built from AI coverage only; non-AI archive stories are retired.
export const getTopicIndex = cache(async () => buildTopicIndex(selectAiArticles(await getDiscoverableArticles())));
