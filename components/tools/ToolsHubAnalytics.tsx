"use client";
import { useEffect, useRef } from "react";
import { trackHomepageEvent } from "@/lib/homepage-analytics";
export default function ToolsHubAnalytics() { const sent = useRef(false); useEffect(() => { if (!sent.current) { sent.current = true; trackHomepageEvent("tools_hub_view"); } }, []); return null; }
