import type { ContextualPollInput } from "../types/article";

export interface ArticlePoll {
  id: string;
  question: string;
  options: string[];
  optionLabels: Record<string, string>;
  active: true;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function slugPart(value: string): string {
  return normalized(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "article";
}

export function validateContextualPoll(input: unknown): input is ContextualPollInput {
  if (!input || typeof input !== "object") return false;
  const candidate = input as Partial<ContextualPollInput>;
  if (typeof candidate.question !== "string" || candidate.question.trim().length < 1 || candidate.question.length > 300) return false;
  if (!Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > 4) return false;
  const labels = candidate.options.filter((option): option is string => typeof option === "string");
  return labels.length === candidate.options.length && labels.every((label) => label.trim().length > 0 && label.length <= 120)
    && new Set(labels.map(normalized)).size === labels.length;
}

export function createContextualPoll(articleSlug: string, input: unknown): ArticlePoll | null {
  if (!validateContextualPoll(input)) return null;
  const question = input.question.trim();
  const labels = input.options.map((option) => option.trim());
  const fingerprint = hash([normalized(question), ...labels.map(normalized)].join("|"));
  const optionLabels: Record<string, string> = {};
  const options = labels.map((label) => {
    const id = `option-${slugPart(label).slice(0, 42)}-${hash(normalized(label)).slice(0, 6)}`;
    optionLabels[id] = label;
    return id;
  });

  return {
    id: `article-${slugPart(articleSlug)}-contextual-v1-${fingerprint}`,
    question,
    options,
    optionLabels,
    active: true,
  };
}
