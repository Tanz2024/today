import { NextResponse } from "next/server";
import { getQuestion, getQuestions } from "@/lib/questions";
import { getRecommendedQuestions } from "@/lib/question-recommendations";
import { handleRecommendationsRequest } from "@/lib/question-recommendations-route-core";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(_request.url);
  const validSlugs = new Set(getQuestions().map((question) => question.slug));
  const excludeSlugs = [...new Set(url.searchParams.getAll("exclude"))].filter((candidate) => validSlugs.has(candidate)).slice(0, 10);
  const result = await handleRecommendationsRequest(slug, { questionExists: (candidate) => Boolean(getQuestion(candidate)), getRecommendations: (candidate) => getRecommendedQuestions(candidate, { excludeSlugs: new Set(excludeSlugs) }) });
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
