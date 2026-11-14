// Optional "Most used" ranking for /compare from the OpenRouter Data API.
//
// Off unless OPENROUTER_RANKINGS_API_KEY is set (a separate variable from the
// inference key, so configuring AI features never switches this on by
// accident). Without it, or when the API cannot be reached, the chart is not
// rendered.
//
// Licence, re-confirmed Nov 2026 at
// https://openrouter.ai/docs/api/api-reference/datasets/daily-token-totals-for-top-50-models
// (and the SDK datasets page): "Data returned by these endpoints is licensed
// under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/): reuse and
// republish it, including commercially, with attribution to OpenRouter." and
// "When republishing or quoting this dataset, OpenRouter must be cited as:
// 'Source: OpenRouter (openrouter.ai/rankings), as of {as_of}.'"
//
// Caveat shown on the page: tokens are counted by each provider's own
// tokenizer and only traffic through OpenRouter is included.

import { boundedFetch } from "@/lib/bounded-fetch";
import { aggregateUsage, type CanonicalModel, type CatalogueEntry, type ChartRow, type UsageRow } from "@/lib/model-rankings";

const RANKINGS = "https://openrouter.ai/api/v1/datasets/rankings-daily";
const MODELS = "https://openrouter.ai/api/v1/models";
const WINDOW_DAYS = 7;

export type UsageRanking = { rows: ChartRow[]; asOf: string; startDate: string; endDate: string };

export function usageRankingEnabled(): boolean {
  return Boolean(process.env.OPENROUTER_RANKINGS_API_KEY?.trim());
}

export async function getMostUsedModels(models: CanonicalModel[]): Promise<UsageRanking | null> {
  const key = process.env.OPENROUTER_RANKINGS_API_KEY?.trim();
  if (!key) return null;
  try {
    const end = new Date(Date.now() - 86_400_000);
    const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 86_400_000);
    const url = new URL(RANKINGS);
    url.searchParams.set("start_date", start.toISOString().slice(0, 10));
    url.searchParams.set("end_date", end.toISOString().slice(0, 10));
    const [rankingsResponse, modelsResponse] = await Promise.all([
      boundedFetch(url, { provider: "OpenRouter rankings", timeoutMs: 6_000, headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 21_600 } }),
      boundedFetch(MODELS, { provider: "OpenRouter models", timeoutMs: 6_000, next: { revalidate: 3600 } }),
    ]);
    if (!rankingsResponse.ok || !modelsResponse.ok) return null;
    const rankings = (await rankingsResponse.json()) as { data?: UsageRow[]; meta?: { as_of?: string; start_date?: string; end_date?: string } };
    const catalogue = (await modelsResponse.json()) as { data?: CatalogueEntry[] };
    if (!Array.isArray(rankings.data) || !rankings.meta?.as_of) return null;
    const rows = aggregateUsage(rankings.data, catalogue.data ?? [], models);
    if (rows.length < 3) return null;
    return { rows, asOf: rankings.meta.as_of, startDate: rankings.meta.start_date ?? "", endDate: rankings.meta.end_date ?? "" };
  } catch {
    return null;
  }
}
