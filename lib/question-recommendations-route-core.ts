export type RecommendationRouteDeps = { questionExists: (slug: string) => boolean; getRecommendations: (slug: string) => Promise<unknown[]> };

export async function handleRecommendationsRequest(slug: string, deps: RecommendationRouteDeps) {
  if (!deps.questionExists(slug)) return { status: 404, body: { error: "Question not found" } };
  try { return { status: 200, body: await deps.getRecommendations(slug) }; }
  catch { return { status: 503, body: { error: "Recommendations are temporarily unavailable." } }; }
}
