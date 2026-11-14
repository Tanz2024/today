import { trackHomepageEvent } from "@/lib/homepage-analytics";

export const TOOL_NAMES = ["word-counter"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
export function trackTool(event: "tools_hub_view" | "tool_open" | "tool_reset", tool: ToolName, metadata: Record<string, string> = {}) {
  trackHomepageEvent(event, { tool, ...metadata });
}
