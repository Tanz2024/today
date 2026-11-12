import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// Lightweight, dependency-free share card (no new packages) for polls and
// Play results — sized for Instagram Stories. Never includes visitor IDs or
// any personal data: only the three text fields the caller passes in.
export const size = { width: 1080, height: 1920 };
export const contentType = "image/png";

function clamp(value: string | null, max: number, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, max);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const kicker = clamp(searchParams.get("kicker"), 40, "BRISASTORY");
  const title = clamp(searchParams.get("title"), 120, "Real people. Brighter days.");
  const subtitle = clamp(searchParams.get("subtitle"), 160, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "96px 80px",
          background: "linear-gradient(160deg, #111111 0%, #18181b 60%, #dc1f32 130%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          <span>Today</span>
          <span style={{ color: "#dc1f32" }}>AI</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#dc1f32",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ display: "flex", fontSize: 40, color: "#d7dce6", lineHeight: 1.4 }}>{subtitle}</div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 34, color: "#d7dce6" }}>brisastory.live</div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
