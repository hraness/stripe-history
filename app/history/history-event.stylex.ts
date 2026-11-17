import * as stylex from "@stylexjs/stylex";

const narrow = "@media (max-width: 34rem)";
const coarse = "@media (pointer: coarse)";
const forced = "@media (forced-colors: active)";

/** Finite event presentation shared by the timeline and metric disclosures.
 * Category hue and theme formulas retain their existing renderer/CSS owners. */
export const historyEventStyles = stylex.create({
  // A hairline above each entry; the category icon carries the only hue.
  frame: {
    borderTopColor: { default: "var(--plain-line)", [forced]: "CanvasText" },
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    paddingTop: { default: "1.5rem", [narrow]: "1.125rem" },
    paddingRight: 0,
    paddingBottom: { default: "1.5rem", [narrow]: "1.125rem" },
    paddingLeft: 0,
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
    fontFamily: "var(--font-display)",
    fontSize: { default: "1.25rem", [narrow]: "1.125rem" },
    fontWeight: 500,
    letterSpacing: "-0.022em",
    lineHeight: { default: 1.25, [narrow]: 1.3 },
    marginTop: "0.5rem",
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
      borderRadius: "0.25rem",
      outlineColor: "var(--plain-focus)",
      outlineStyle: "solid",
      outlineWidth: "2px",
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
    color: "var(--plain-body)",
    fontSize: { default: "1rem", [narrow]: "0.96875rem" },
    marginTop: "0.5rem",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    lineHeight: { default: 1.6, [narrow]: 1.55 },
  },
  facts: {
    display: "grid",
    fontSize: "var(--text-caption)",
    gap: "0.25rem",
    marginTop: "0.875rem",
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
