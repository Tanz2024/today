export type PulsePoll = { id: string; question: string; options: readonly string[]; active: boolean; optionLabels?: Record<string, string> };
export type PulseCounts = Record<string, number>;
export type PulseResponse = { status: number; body: Record<string, unknown> };
export interface PulseRouteDependencies<Request = unknown> {
  resolvePoll: (id: string) => Promise<PulsePoll | undefined>;
  getVisitorId: (request: Request) => string | null;
  getPollCounts: (poll: PulsePoll) => Promise<PulseCounts>;
  getPollBallot: (visitorId: string, pollId: string) => Promise<string | null>;
  recordPollVote: (visitorId: string, poll: PulsePoll, option: string) => Promise<{ status: "recorded" | "duplicate"; counts: PulseCounts } | null>;
  isValidPollOption: (options: readonly string[], option: unknown) => option is string;
  shouldRecordPollVote: (existingBallot: string | null) => boolean;
  isInvalidPollState: (error: unknown) => boolean;
}

export async function handlePulseGet<Request>(id: string, request: Request, deps: PulseRouteDependencies<Request>): Promise<PulseResponse> {
  const poll = await deps.resolvePoll(id);
  if (!poll) return { status: 404, body: { error: "Poll not found" } };
  const visitorId = deps.getVisitorId(request);
  const selectedOptionId = visitorId ? await deps.getPollBallot(visitorId, poll.id) : null;
  let counts: PulseCounts;
  try { counts = await deps.getPollCounts(poll); } catch (error) { if (deps.isInvalidPollState(error)) return { status: 503, body: { error: "Voting is temporarily unavailable." } }; throw error; }
  return { status: 200, body: { poll, counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0), hasVoted: Boolean(selectedOptionId), ...(selectedOptionId ? { selectedOptionId } : {}) } };
}

export async function handlePulsePost<Request>(id: string, request: Request, body: unknown, deps: PulseRouteDependencies<Request>): Promise<PulseResponse> {
  const poll = await deps.resolvePoll(id);
  if (!poll) return { status: 404, body: { error: "Poll not found" } };
  const option = (body as { option?: unknown } | null)?.option;
  if (!deps.isValidPollOption(poll.options, option)) return { status: 400, body: { error: "Invalid poll option" } };
  const visitorId = deps.getVisitorId(request);
  if (!visitorId) return { status: 503, body: { error: "Voting is temporarily unavailable." } };
  const existingBallot = await deps.getPollBallot(visitorId, poll.id);
  if (!deps.shouldRecordPollVote(existingBallot)) return { status: 200, body: { counts: await deps.getPollCounts(poll), duplicate: true } };
  const result = await deps.recordPollVote(visitorId, poll, option);
  if (!result) return { status: 503, body: { error: "Voting is temporarily unavailable." } };
  return { status: 200, body: { counts: result.counts, duplicate: result.status === "duplicate" } };
}
