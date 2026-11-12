import picks from "@/content/metro-picks.json";
import { filterMetroPicks } from "@/lib/metro-picks-filter";
import type { MetroPick } from "@/types/metro-pick";

// Kuala Lumpur is the first city; content/metro-picks.json is intentionally
// empty until real, verified entries exist — do not add placeholder or
// invented businesses/prices/hours here. Add real entries with their own
// verifiedDate and an official sourceUrl (the business's own site/menu/
// socials), not a random review aggregator.
export const DEFAULT_CITY = "kuala-lumpur";

export function getMetroPicks(city: string = DEFAULT_CITY, limit = 6): MetroPick[] {
  return filterMetroPicks(picks as MetroPick[], city, limit);
}

export function hasVerifiedMetroPicks(city: string = DEFAULT_CITY): boolean {
  return getMetroPicks(city, 1).length > 0;
}
