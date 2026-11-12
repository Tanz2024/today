"use client";
import { useEffect, useRef } from "react";
import { trackTool, type ToolName } from "@/lib/tools/analytics";
export default function ToolAnalytics({ tool }: { tool: ToolName }) { const sent = useRef(false); useEffect(() => { if (!sent.current) { sent.current = true; trackTool("tool_open", tool); } }, [tool]); return null; }
