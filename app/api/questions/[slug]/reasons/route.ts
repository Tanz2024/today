import { NextRequest, NextResponse } from "next/server";
import { getQuestion } from "@/lib/questions";
import { getQuestionPoll } from "@/lib/question-polls";
import { getVisitorId } from "@/lib/identity";
import { getApprovedQuestionReasons, submitQuestionReason } from "@/lib/question-reasons";
import { handleQuestionReasonsGet, handleQuestionReasonsPost, type QuestionReasonsRouteDependencies } from "@/lib/question-reasons-route-core";

const dependencies: QuestionReasonsRouteDependencies<NextRequest> = { getQuestion, getQuestionPoll, getVisitorId, getApprovedQuestionReasons, submitQuestionReason };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const result = await handleQuestionReasonsGet((await params).slug, dependencies);
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const result = await handleQuestionReasonsPost((await params).slug, body, request, dependencies);
  return NextResponse.json(result.body, { status: result.status });
}
