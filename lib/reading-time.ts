import readingTime from "reading-time";

// Shared by MDX and Appwrite-backed articles: the body is the source of truth.
export function formatReadingTime(body: string): string {
  return `${Math.max(1, Math.round(readingTime(body).minutes))} min read`;
}
