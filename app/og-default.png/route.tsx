import { ImageResponse } from "next/og";
import { SITE_HOSTNAME } from "@/lib/site-url";

// TodayAI's default social card (1200×630), generated from text — no
// third-party or legacy-brand artwork. Takes no parameters, so it can't be
// used to render arbitrary text. Replace with a designed asset when one exists.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#111114", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em" }}>
          <span>Today</span>
          <span style={{ color: "#dc1f32" }}>AI</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.045em", maxWidth: 980 }}>AI news, guides, tools and games.</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#d4d4d8" }}>Read · Use · Play · Compare</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>{SITE_HOSTNAME}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
