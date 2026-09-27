import * as stylex from "@stylexjs/stylex";

const narrow = "@media (max-width: 34rem)";
const coarse = "@media (pointer: coarse)";
const forced = "@media (forced-colors: active)";

/** Finite event presentation shared by the timeline and metric disclosures.
 * Category hue and theme formulas retain their existing renderer/CSS owners. */
export const historyEventStyles = stylex.create({
  frame: {
    borderInlineStartColor: { default: "var(--history-category-ink)", [forced]: "CanvasText" },
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: "3px",
    borderTopColor: "var(--plain-line)",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    paddingTop: { default: "1rem", [narrow]: "0.8rem" },
    paddingRight: 0,
    paddingBottom: { default: "1rem", [narrow]: "0.8rem" },
    paddingLeft: { default: "0.9rem", [narrow]: "0.7rem" },
  },
  lastFrame: {
    borderBottomColor: "var(--plain-line)",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  article: { scrollMarginTop: "calc(var(--history-filter-stack-offset) + 1rem)" },
  kicker: {
    alignItems: "center",
    color: "var(--plain-muted)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "var(--text-caption)",
    gap: "0.35rem 0.5rem",
    margin: 0,
  },
  date: {
    color: "var(--plain-foreground)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  title: {
    fontSize: { default: "1.05rem", [narrow]: "1rem" },
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: { default: 1.35, [narrow]: 1.4 },
    marginTop: "0.35rem",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  // The category is a plain labelled link: its icon and the event's rail carry
  // the hue, so the kicker reads as one line of text rather than a chip row.
  type: {
    alignItems: "center",
    backgroundColor: { default: "transparent", [forced]: "Canvas" },
    backgroundImage: "none",
    borderStyle: "none",
    borderWidth: 0,
    color: { default: "var(--plain-foreground)", [forced]: "CanvasText" },
    display: "inline-flex",
    fontWeight: 500,
    gap: "0.3rem",
    minHeight: { default: "1.5rem", [coarse]: "var(--plain-link-target-min, 48px)" },
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    overflowWrap: "anywhere",
    textDecorationLine: { default: "none", ":hover": "underline" },
    textDecorationStyle: "solid",
    textDecorationColor: "currentColor",
    textDecorationThickness: "1px",
    textUnderlineOffset: "0.15em",
    // Preserve the product grammar's native focus ring and square focus radius.
    ":focus-visible": {
      borderRadius: "1px",
      outlineColor: "currentColor",
      outlineStyle: "dotted",
      outlineWidth: "1px",
      outlineOffset: "3px",
    },
  },
  typeIcon: { color: "var(--history-category-ink)" },
  // Metric disclosures do not own category variables. Their old var-bearing
  // border shorthand computed to initial none/medium/currentColor, including
  // zero width under forced colors (which only replaced the border color).
  disclosureType: {
    borderColor: { default: "currentColor", [forced]: "CanvasText" },
    borderStyle: "none",
    borderWidth: "medium",
  },
  // Status and confidence are plain words after a middle-dot separator.
  status: {
    alignItems: "center",
    color: "var(--plain-muted)",
    display: "inline-flex",
    gap: "0.5rem",
    overflowWrap: "anywhere",
    "::before": {
      color: "var(--plain-muted)",
      content: '"·"',
      fontWeight: 400,
    },
  },
  confidence: { color: "var(--plain-foreground)", fontWeight: 500 },
  summary: {
    marginTop: "0.5rem",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    lineHeight: { default: "inherit", [narrow]: 1.5 },
  },
  facts: {
    display: "grid",
    fontSize: "var(--text-caption)",
    gap: "0.2rem",
    marginTop: "0.65rem",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  factRow: {
    display: { default: "grid", [narrow]: "block" },
    gap: "0.75rem",
    gridTemplateColumns: "minmax(5.5rem, 0.3fr) minmax(0, 1fr)",
  },
  factTerm: { color: "var(--plain-muted)", margin: 0 },
  factValue: { fontVariantNumeric: "tabular-nums", margin: 0 },
  sources: { color: "var(--plain-muted)", fontSize: "var(--text-caption)", textAlign: "start" },
  sourcesLabel: { color: "var(--plain-muted)", marginInlineEnd: "0.4rem" },
  sourceLink: {
    alignItems: { default: null, [coarse]: "center" },
    display: { default: "inline-block", [coarse]: "inline-flex" },
    minHeight: { default: "1.5rem", [coarse]: "var(--plain-link-target-min, 48px)" },
  },
});
