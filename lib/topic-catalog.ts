import "server-only";
import { cache } from "react";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { buildTopicIndex } from "@/lib/topics";

// Built in memory from the shared catalogue: no per-topic Appwrite queries.
export const getTopicIndex = cache(async () => buildTopicIndex(await getDiscoverableArticles()));
