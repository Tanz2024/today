export type RouteResult = { status: number; body: Record<string, unknown> };
export type RoutePoll = { id: string; options: string[] };
export interface QuestionReasonsRouteDependencies<Request = unknown> {
  getQuestion: (slug: string) => unknown;
  getQuestionPoll: (slug: string) => RoutePoll | undefined;
  getVisitorId: (request: Request) => string | null;
  getApprovedQuestionReasons: (pollId: string) => Promise<Array<{ optionId: string; reason: string }>>;
  submitQuestionReason: (input: { pollId: string; questionSlug: string; optionId: string; reason: unknown; visitorHash: string }) => Promise<{ ok: true } | { ok: false; kind: "invalid" | "duplicate" | "rate_limited" | "unavailable"; error?: string }>;
}

function questionExists<Request>(deps: QuestionReasonsRouteDependencies<Request>, slug: string): boolean { return Boolean(deps.getQuestion(slug)); }

export async function handleQuestionReasonsGet<Request>(slug: string, deps: QuestionReasonsRouteDependencies<Request>): Promise<RouteResult> {
  if (!questionExists(deps, slug)) return { status: 404, body: { error: "Question not found" } };
  const poll = deps.getQuestionPoll(slug);
  if (!poll) return { status: 200, body: { reasons: [] } };
  return { status: 200, body: { reasons: await deps.getApprovedQuestionReasons(poll.id) } };
}

export async function handleQuestionReasonsPost<Request>(slug: string, body: unknown, request: Request, deps: QuestionReasonsRouteDependencies<Request>): Promise<RouteResult> {
  if (!questionExists(deps, slug)) return { status: 404, body: { error: "Question not found" } };
  const poll = deps.getQuestionPoll(slug);
  if (!poll) return { status: 404, body: { error: "Question poll not found" } };
  if (!body || typeof body !== "object") return { status: 400, body: { error: "Invalid request" } };
  const input = body as { optionId?: unknown; reason?: unknown };
  if (typeof input.optionId !== "string" || !poll.options.includes(input.optionId)) return { status: 400, body: { error: "Invalid option" } };
  const visitorHash = deps.getVisitorId(request);
  if (!visitorHash) return { status: 503, body: { error: "Reason submissions are temporarily unavailable." } };
  const result = await deps.submitQuestionReason({ pollId: poll.id, questionSlug: slug, optionId: input.optionId, reason: input.reason, visitorHash });
  if (result.ok) return { status: 201, body: { ok: true, status: "pending" } };
  if (result.kind === "invalid") return { status: 400, body: { error: result.error ?? "Invalid reason" } };
  if (result.kind === "duplicate") return { status: 409, body: { error: "You have already submitted a reason for this question." } };
  if (result.kind === "rate_limited") return { status: 429, body: { error: "You have reached the daily reason limit." } };
  return { status: 503, body: { error: "Reason submissions are temporarily unavailable." } };
}
