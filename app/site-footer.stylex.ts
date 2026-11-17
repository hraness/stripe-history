import * as stylex from "@stylexjs/stylex";

const forced = "@media (forced-colors: active)";

/** The single product footer. */
export const footerStyles = stylex.create({
  root: {
    borderTopColor: { default: "var(--plain-line)", [forced]: "CanvasText" },
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    color: "var(--plain-muted)",
    marginTop: "5rem",
    paddingBlock: "1.25rem 2.5rem",
  },
  row: {
    alignItems: "center",
    columnGap: "1.5rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: "0.5rem",
  },
  links: {
    alignItems: "center",
    columnGap: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    rowGap: 0,
  },
  link: {
    alignItems: "center",
    color: { default: "inherit", ":hover": "var(--plain-foreground)" },
    display: "inline-flex",
    fontSize: "0.875rem",
    minBlockSize: "var(--plain-link-target-min)",
    minInlineSize: "var(--plain-link-target-min)",
    textDecorationLine: "none",
  },
  // The hraness.com wordmark: Funnel Display, tracked capitals, muted ink.
  wordmark: {
    alignItems: "center",
    color: { default: "var(--plain-muted)", ":hover": "var(--plain-foreground)" },
    display: "inline-flex",
    fontFamily: "var(--font-display)",
    fontSize: "0.9375rem",
    fontWeight: 450,
    letterSpacing: "0.1em",
    lineHeight: 1,
    minBlockSize: "var(--plain-link-target-min)",
    textDecorationLine: "none",
    textTransform: "uppercase",
  },
  note: {
    color: "var(--plain-muted)",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    margin: 0,
    paddingTop: "0.5rem",
  },
});
