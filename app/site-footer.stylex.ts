import * as stylex from "@stylexjs/stylex";

/** Product-owned resources, distinct from the shared social/consent footer. */
export const footerResourcesStyles = stylex.create({
  root: {
    alignItems: "center",
    borderTopColor: "var(--plain-line)",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    color: "var(--plain-muted)",
    display: "flex",
    flexWrap: "wrap",
    columnGap: "1.5rem",
    rowGap: "0.25rem",
    minHeight: "2.625rem",
    marginTop: "4.5rem",
    paddingBlock: "1.25rem 0.5rem",
  },
  afterAskAi: { marginTop: "1.5rem" },
  label: {
    color: "var(--plain-foreground)",
    fontFamily: "var(--font-display)",
    fontSize: "1.0625rem",
    fontWeight: 560,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  links: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    columnGap: "1.25rem",
    rowGap: 0,
    marginInlineStart: "auto",
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
  note: {
    color: "var(--plain-muted)",
    flexBasis: "100%",
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    margin: 0,
    paddingBlock: "0.5rem 0",
  },
});
