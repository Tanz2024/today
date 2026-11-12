import type { Article } from "@/types/article";

// Reader-facing description. Used for the visible standfirst, the meta
// description and Article JSON-LD so all three say the same thing.
export function displayArticleDescription(article: Pick<Article, "description">) {
  if (article.description.startsWith("Sasaki is an overworked salaryman")) {
    return "After a punishing night at work, Sasaki finds an unexpected moment of connection with a young woman outside his usual supermarket.";
  }
  return article.description;
}

