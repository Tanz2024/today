// Pure, import-alias-free filter so it's directly unit-testable.
export type MetroPickLike = { city: string };

export function filterMetroPicks<T extends MetroPickLike>(all: T[], city: string, limit: number): T[] {
  return all.filter((pick) => pick.city === city).slice(0, limit);
}
