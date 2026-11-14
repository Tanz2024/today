// Live AI model facts for /compare, from OpenRouter's public models API
// (https://openrouter.ai/api/v1/models — no key, no cost). Every number shown
// is the API's own value: API price per token, context window, modalities and
// listing date. Nothing is estimated or scored. If the API is unreachable the
// section is hidden rather than showing stale or invented numbers.

import { boundedFetch } from "@/lib/bounded-fetch";

const ENDPOINT = "https://openrouter.ai/api/v1/models";

/** Makers shown, mapped to the consumer product readers know them by. */
export const MODEL_MAKERS: { prefix: string; maker: string; product: string }[] = [
  { prefix: "openai", maker: "OpenAI", product: "ChatGPT" },
  { prefix: "anthropic", maker: "Anthropic", product: "Claude" },
  { prefix: "google", maker: "Google", product: "Gemini" },
  { prefix: "x-ai", maker: "xAI", product: "Grok" },
  { prefix: "deepseek", maker: "DeepSeek", product: "DeepSeek" },
  { prefix: "mistralai", maker: "Mistral AI", product: "Le Chat" },
];

export type ModelFact = {
  id: string;
  name: string;
  maker: string;
  product: string;
  /** USD per 1M input tokens. */
  inputPerM: number;
  /** USD per 1M output tokens. */
  outputPerM: number;
  contextTokens: number;
  inputModalities: string[];
  outputModalities: string[];
  listedOn: string;
};

type ApiModel = {
  id: string;
  name: string;
  created: number;
  context_length: number | null;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
};

export type ModelSnapshot = { models: ModelFact[]; fetchedAt: string };

/** Newest text-generating model per maker (batch/free/variant ids excluded). */
export async function getLatestModelsByMaker(): Promise<ModelSnapshot | null> {
  try {
    const response = await boundedFetch(ENDPOINT, { provider: "OpenRouter models", timeoutMs: 6_000, next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: ApiModel[] };
    const models: ModelFact[] = [];
    for (const { prefix, maker, product } of MODEL_MAKERS) {
      const newest = data
        .filter((model) => model.id.startsWith(`${prefix}/`) && !model.id.includes(":"))
        .filter((model) => model.architecture?.output_modalities?.includes("text"))
        .filter((model) => Number(model.pricing?.prompt) > 0 && Number(model.pricing?.completion) > 0 && model.context_length)
        .sort((a, b) => b.created - a.created)[0];
      if (!newest) continue;
      models.push({
        id: newest.id,
        name: newest.name.replace(/^[^:]+:\s*/, ""),
        maker,
        product,
        inputPerM: Number(newest.pricing!.prompt) * 1_000_000,
        outputPerM: Number(newest.pricing!.completion) * 1_000_000,
        contextTokens: newest.context_length!,
        inputModalities: newest.architecture?.input_modalities ?? [],
        outputModalities: newest.architecture?.output_modalities ?? [],
        listedOn: new Date(newest.created * 1000).toISOString().slice(0, 10),
      });
    }
    return models.length >= 2 ? { models, fetchedAt: new Date().toISOString() } : null;
  } catch {
    return null;
  }
}
