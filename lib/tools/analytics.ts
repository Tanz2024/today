import { trackHomepageEvent } from "@/lib/homepage-analytics";

export const TOOL_NAMES = ["student-budget", "cgpa", "trip-budget", "bill-splitter", "attendance", "word-counter", "date-calculator", "percentage-calculator", "focus-timer", "compatibility-check"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
export function trackTool(event: "tools_hub_view" | "tool_open" | "tool_calculation_complete" | "tool_reset" | "tool_share" | "tool_article_click", tool: ToolName, metadata: Record<string, string> = {}) {
  trackHomepageEvent(event, { tool, ...metadata });
}
