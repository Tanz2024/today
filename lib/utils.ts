import clsx, { type ClassValue } from "clsx";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateStr: string): string {
  const d = clampToLaunch(dateStr);
  return d.toLocaleDateString("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
