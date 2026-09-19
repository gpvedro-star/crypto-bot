export const dynamic = "force-static";

import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B2D5B", color: "white", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", width: 64, height: 64, background: "#5BA9E6", borderRadius: 12 }} />
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 6, fontWeight: 700 }}>NUVORA</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.02, fontWeight: 700 }}>AI for Normal People.</div>
          <div style={{ display: "flex", fontSize: 30, color: "#A7D0F2", fontFamily: "sans-serif" }}>{site.description.slice(0, 96)}…</div>
        </div>
      </div>
    ),
    size,
  );
}
