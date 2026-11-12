import { Query } from "node-appwrite";

export const DAILY_INTERACTIVE_SLOTS = ["pulse", "daily_trivia", "group_chat_question", "this_or_that", "daily_drop"] as const;

export type DailyInteractiveSlot = (typeof DAILY_INTERACTIVE_SLOTS)[number];
export const PUBLISHABLE_DAILY_STATUSES = ["approved", "scheduled", "published"] as const;

export function dailyInteractiveEditionKey(dateKey: string) {
  return `daily-interactive-${dateKey}`;
}

export function dailyEditionContentQueries(slot: string, editionKey: string) {
  return [Query.equal("slot", slot), Query.equal("editionKey", editionKey), Query.limit(100)];
}

export type DailyEditionDiagnostic = {
  editionKey: string;
  expectedSlots: string[];
  receivedSlots: string[];
  missingSlots: string[];
  duplicateSlots: string[];
  documentIds: string[];
  invalidStatusDocumentIds: string[];
  wrongEditionKeyDocumentIds: string[];
  valid: boolean;
};

export function validateDailyInteractiveEdition(
  items: Array<{ $id?: string; id?: string; slot?: string; editionKey?: string; status?: string }>,
  editionKey: string,
): DailyEditionDiagnostic {
  const expectedSlots = [...DAILY_INTERACTIVE_SLOTS];
  const receivedSlots = items.map((item) => String(item.slot ?? ""));
  const counts = new Map<string, number>();
  for (const slot of receivedSlots) counts.set(slot, (counts.get(slot) ?? 0) + 1);
  const missingSlots = expectedSlots.filter((slot) => !counts.has(slot));
  const duplicateSlots = expectedSlots.filter((slot) => (counts.get(slot) ?? 0) > 1);
  const documentIds = items.map((item) => String(item.$id ?? item.id ?? "")).filter(Boolean);
  const invalidStatusDocumentIds = items
    .filter((item) => !PUBLISHABLE_DAILY_STATUSES.includes(item.status as (typeof PUBLISHABLE_DAILY_STATUSES)[number]))
    .map((item) => String(item.$id ?? item.id ?? "")).filter(Boolean);
  const wrongEditionKeyDocumentIds = items
    .filter((item) => item.editionKey !== editionKey)
    .map((item) => String(item.$id ?? item.id ?? "")).filter(Boolean);
  const valid = items.length === expectedSlots.length &&
    receivedSlots.every((slot) => expectedSlots.includes(slot as DailyInteractiveSlot)) &&
    missingSlots.length === 0 && duplicateSlots.length === 0 &&
    invalidStatusDocumentIds.length === 0 && wrongEditionKeyDocumentIds.length === 0;
  return { editionKey, expectedSlots, receivedSlots, missingSlots, duplicateSlots, documentIds, invalidStatusDocumentIds, wrongEditionKeyDocumentIds, valid };
}

export function isCompleteDailyEdition(items: Array<{ slot?: string; editionKey?: string }>, editionKey: string) {
  return validateDailyInteractiveEdition(items, editionKey).valid;
}
