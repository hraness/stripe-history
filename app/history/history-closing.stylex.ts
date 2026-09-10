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
  maker: {
    ...section,
    alignItems: "start",
    gridTemplateColumns: {
      default: "minmax(0, 0.8fr) minmax(0, 1.2fr)",
      "@media (max-width: 48rem)": "minmax(0, 1fr)",
    },
  },
  header: { display: "grid", maxInlineSize: "var(--hraness-marketing-copy-measure)", gap: "0.75rem" },
  heading: { margin: 0, fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500, lineHeight: 1.15 },
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
    fontSize: "1.05rem",
    fontWeight: 500,
    outline: { default: null, ":focus-visible": "2px solid var(--plain-link)" },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
  answer: { display: "grid", gap: "1rem", maxInlineSize: "var(--hraness-marketing-prose-measure)", paddingBlock: "0 1.5rem" },
  paragraph: { margin: 0, color: "var(--hraness-marketing-muted)", lineHeight: 1.6 },
  body: { display: "grid", minInlineSize: 0, gap: "1rem" },
  links: { display: "flex", flexWrap: "wrap", gap: "0.5rem 1.25rem", margin: 0, padding: 0, listStyle: "none", fontSize: "0.95rem", fontWeight: 500 },
});
