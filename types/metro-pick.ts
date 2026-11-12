export type MetroPickLabel =
  | "Under RM30"
  | "Near MRT/LRT"
  | "After Class"
  | "Weekend Pick"
  | "Study Spot"
  | "Late-Night Food";

export interface MetroPick {
  id: string;
  /** City slug — e.g. "kuala-lumpur". Lets other cities be added later. */
  city: string;
  title: string;
  location: string;
  priceRange: string;
  nearestTransit: string;
  description: string;
  labels: MetroPickLabel[];
  /** ISO date this entry was last confirmed accurate. */
  verifiedDate: string;
  /** Official source — the business's own site/menu/socials, not a review site. */
  sourceUrl: string;
}
