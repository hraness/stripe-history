import { ImageResponse } from "next/og";
import { site } from "./site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = site.socialImageAlt;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        aria-label={alt}
        role="img"
        style={{
          alignItems: "flex-start",
          background: "#ffffff",
          color: "#171717",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "center",
          letterSpacing: "-0.06em",
          padding: "88px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          <div style={{ fontSize: "96px", fontWeight: 700 }}>{site.name}</div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: 400,
              letterSpacing: "-0.035em",
              lineHeight: 1.15,
              maxWidth: "940px",
            }}
          >
            Stripe company history
          </div>
        </div>
      </div>
    ),
    size,
  );
}
