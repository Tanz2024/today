// Pure, import-alias-free reaction-replacement logic so it's directly
// unit-testable. Captures the actual business rule: a visitor has at most
// one active quick reaction per target, and picking a new one replaces
// (not stacks on top of) the previous one.

export type ReactionTransition<T> =
  | { kind: "noop" }
  | { kind: "first"; increment: T }
  | { kind: "replace"; decrement: T; increment: T };

export function resolveQuickReactionTransition<T>(existing: T | null, next: T): ReactionTransition<T> {
  if (existing === next) return { kind: "noop" };
  if (existing === null) return { kind: "first", increment: next };
  return { kind: "replace", decrement: existing, increment: next };
}
