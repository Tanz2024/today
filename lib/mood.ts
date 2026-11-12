import { getAllArticles } from "@/lib/articles";
import type { Article, MoodTag } from "@/types/article";

export { MOOD_OPTIONS, isMoodTag } from "@/lib/mood-options";

// Purely topical content routing — never treated as psychological/medical
// profiling, and nothing about the selection is stored server-side.
export function getArticlesForMood(mood: MoodTag, limit = 6): Article[] {
  return getAllArticles()
    .filter((article) => article.moods?.includes(mood))
    .slice(0, limit);
}
