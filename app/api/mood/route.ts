import { NextRequest, NextResponse } from "next/server";
import { getArticlesForMood, isMoodTag } from "@/lib/mood";

export async function GET(request: NextRequest) {
  const mood = request.nextUrl.searchParams.get("mood");
  if (!isMoodTag(mood)) return NextResponse.json({ articles: [] }, { status: 400 });

  const articles = getArticlesForMood(mood).map((article) => ({
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: article.category,
    image: article.image,
    imageAlt: article.imageAlt,
    readingTime: article.readingTime,
  }));
  return NextResponse.json({ articles }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
}
