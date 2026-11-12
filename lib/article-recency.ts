import { clampToLaunch } from "@/lib/launch";

const EDITORIAL_TIME_ZONE = "Asia/Kuala_Lumpur";

function parsePublicationDate(value: string | Date): Date | null {
  const date = clampToLaunch(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatArticleRecency(value: string | Date, now = new Date()): string {
  const published = parsePublicationDate(value);
  if (!published || published.getTime() > now.getTime()) return "JUST NOW";

  const minutes = Math.floor((now.getTime() - published.getTime()) / 60_000);
  if (minutes < 60) return minutes <= 0 ? "JUST NOW" : `${minutes} MIN AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "HOUR" : "HOURS"} AGO`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "DAY" : "DAYS"} AGO`;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(published).toUpperCase();
}
