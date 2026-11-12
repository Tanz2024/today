import { NextRequest, NextResponse } from "next/server";
import { getPoll, getPollBallot, getPollCounts, InvalidPollStateError, recordPollVote } from "@/lib/polls";
import { getVisitorId } from "@/lib/identity";
import { isValidPollOption, shouldRecordPollVote } from "@/lib/poll-validation";
import { getAllArticles } from "@/lib/articles";
import { createContextualPoll } from "@/lib/article-polls";
import { Query } from "node-appwrite";
import { APPWRITE_DATABASE_ID, getDatabases } from "@/lib/appwrite";
import { EDITORIAL_COLLECTION_ID } from "@/lib/editorial-content-config";
import { handlePulseGet, handlePulsePost, type PulsePoll, type PulseRouteDependencies } from "@/lib/pulse-route-core";
import { isAppwriteDatabaseUnavailable } from "@/lib/appwrite-errors";

async function resolvePoll(id: string): Promise<PulsePoll | undefined> {
  const staticPoll = getPoll(id);
  if (staticPoll) return staticPoll;
  for (const article of getAllArticles()) {
    const poll = createContextualPoll(article.slug, article.contextualPoll);
    if (poll?.id === id) return poll;
  }
  const databases = getDatabases();
  if (databases) {
    try {
      const result = await databases.listDocuments(APPWRITE_DATABASE_ID, EDITORIAL_COLLECTION_ID, [Query.equal("slot", "pulse"), Query.equal("status", "scheduled"), Query.limit(100)]);
      for (const document of result.documents) {
        let payload: Record<string, unknown> = {};
        try { payload = typeof document.payload === "string" ? JSON.parse(document.payload) : (document.payload as Record<string, unknown> ?? {}); } catch { continue; }
        const candidateId = String(payload.id ?? document.externalId ?? document.$id ?? "");
        const question = typeof payload.question === "string" ? payload.question : String(document.title ?? "");
        const options = Array.isArray(payload.options) ? payload.options.filter((option): option is string => typeof option === "string") : [];
        if (candidateId === id && question && options.length >= 2) return { id, question, options, active: true };
      }
    } catch (error) {
      if (!isAppwriteDatabaseUnavailable(error)) console.error("[pulse] failed to resolve editorial poll", error instanceof Error ? error.message : "unknown error");
    }
  }
  return undefined;
}

const dependencies: PulseRouteDependencies<NextRequest> = {
  resolvePoll,
  getVisitorId,
  getPollCounts: (poll) => getPollCounts(poll as Parameters<typeof getPollCounts>[0]),
  getPollBallot,
  recordPollVote: (visitorId, poll, option) => recordPollVote(visitorId, poll as Parameters<typeof recordPollVote>[1], option),
  isValidPollOption,
  shouldRecordPollVote,
  isInvalidPollState: (error) => error instanceof InvalidPollStateError,
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await handlePulseGet((await params).id, request, dependencies);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const result = await handlePulsePost((await params).id, request, body, dependencies);
  return NextResponse.json(result.body, { status: result.status });
}
