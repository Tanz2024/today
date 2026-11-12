// Pure, import-alias-free poll rules so they're directly unit-testable.

export function isValidPollOption(options: readonly string[], option: unknown): option is string {
  return typeof option === "string" && options.includes(option);
}

// One vote per visitor per poll, ever: if they already have a ballot on
// record, a repeat vote must be silently ignored rather than recorded again.
export function shouldRecordPollVote(existingBallot: string | null): boolean {
  return existingBallot === null;
}
