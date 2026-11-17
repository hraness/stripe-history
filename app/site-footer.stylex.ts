import * as stylex from "@stylexjs/stylex";

const forced = "@media (forced-colors: active)";

/** The single product footer, per the shared Hraness product footer standard. */
export const footerStyles = stylex.create({
  root: {
    borderTopColor: { default: "var(--plain-line)", [forced]: "CanvasText" },
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    color: "var(--plain-muted)",
    marginTop: "5rem",
    paddingBlock: "1rem max(1.25rem, env(safe-area-inset-bottom))",
  },
  inner: {
    alignItems: "center",
    columnGap: "1.5rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: "0.25rem",
  },
  group: {
    alignItems: "center",
    columnGap: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    rowGap: 0,
  },
  // The end group stays right-aligned when the row wraps.
  end: {
    marginInlineStart: "auto",
  },
  link: {
    alignItems: "center",
    color: { default: "var(--plain-muted)", ":hover": "var(--plain-foreground)" },
    display: "inline-flex",
    fontSize: "0.8125rem",
    minBlockSize: "2.75rem",
    textDecorationLine: "none",
  },
  // The hraness.com wordmark: Funnel Display 450, tracked capitals, muted ink.
  wordmark: {
    fontFamily: "var(--font-display)",
    fontSize: "0.875rem",
    fontWeight: 450,
    letterSpacing: "0.1em",
    lineHeight: 1,
    textTransform: "uppercase",
  },
  note: {
    color: "var(--plain-muted)",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    margin: 0,
  },
});
