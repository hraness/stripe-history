import * as stylex from "@stylexjs/stylex";

// The root introduction: a plain title, one descriptive line, and quiet
// disclosure lines on the page measure.
export const orientationStyles = stylex.create({
  hero: {
    color: "var(--plain-foreground)",
    display: "grid",
    gap: "0.5rem",
    minInlineSize: 0,
    paddingBlock: "clamp(2rem, 6vw, 3.5rem) 1.5rem",
  },
  hero__heading: {
    color: "var(--plain-foreground)",
    fontFamily: "var(--font-display)",
    fontSize: "clamp(2.25rem, 6vw, 3.25rem)",
    fontWeight: 440,
    letterSpacing: "-0.045em",
    lineHeight: 1.04,
    margin: 0,
  },
  hero__summary: {
    color: "var(--plain-body)",
    fontSize: "clamp(1.0625rem, 2vw, 1.1875rem)",
    lineHeight: 1.5,
    margin: 0,
    maxInlineSize: "40rem",
    textWrap: "pretty",
  },
  hero__boundary: {
    color: { default: "var(--plain-muted)", "@media (forced-colors: active)": "CanvasText" },
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    margin: 0,
    marginTop: "0.25rem",
    maxInlineSize: "40rem",
  },
});
