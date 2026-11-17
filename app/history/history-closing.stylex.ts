import * as stylex from "@stylexjs/stylex";

// Product-owned semantic closing slots. Keep the shared tokens, not its
// required eyebrow labels or a second unlayered stylesheet.
const section = {
  paddingBlock: "var(--hraness-marketing-section-space)",
  borderBlockStartColor: "var(--hraness-marketing-line)",
  borderBlockStartStyle: "solid",
  borderBlockStartWidth: "1px",
  scrollMarginBlockStart: "4rem",
  display: "grid",
  gap: "clamp(1.5rem, 4vw, 3rem)",
};

export const closingStyles = stylex.create({
  section,
  header: { display: "grid", maxInlineSize: "var(--hraness-marketing-copy-measure)", gap: "0.75rem" },
  heading: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "clamp(1.5rem, 3.4vw, 1.875rem)",
    fontWeight: 460,
    letterSpacing: "-0.035em",
    lineHeight: 1.08,
  },
  list: { display: "grid" },
  question: {
    borderBlockStartColor: "var(--hraness-marketing-line)",
    borderBlockStartStyle: "solid",
    borderBlockStartWidth: "1px",
  },
  summary: {
    minBlockSize: "3.25rem",
    paddingBlock: "1rem",
    color: "var(--hraness-marketing-ink)",
    cursor: "pointer",
    fontSize: "1.0625rem",
    fontWeight: 500,
    borderRadius: "0.375rem",
    outline: { default: null, ":focus-visible": "2px solid var(--plain-focus)" },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
  answer: { display: "grid", gap: "1rem", maxInlineSize: "var(--hraness-marketing-prose-measure)", paddingBlock: "0 1.5rem" },
  paragraph: { margin: 0, color: "var(--hraness-marketing-muted)", lineHeight: 1.6 },
});
