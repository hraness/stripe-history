import * as stylex from "@stylexjs/stylex";

/** Product-owned resources, distinct from the shared social/consent footer. */
export const footerResourcesStyles = stylex.create({
  root: {
    alignItems: "center",
    borderTop: "1px solid var(--plain-line)",
    color: "var(--plain-muted)",
    display: "flex",
    flexWrap: "wrap",
    columnGap: "1rem",
    rowGap: "0.5rem",
    minHeight: "2.625rem",
    marginTop: "3.5rem",
    paddingBlock: "0.625rem",
  },
  afterAskAi: { marginTop: "1rem" },
  label: { fontSize: "0.9rem", fontWeight: 600, margin: 0 },
  links: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    columnGap: "0.85rem",
    rowGap: "0.35rem",
    marginInlineStart: "auto",
  },
  link: {
    alignItems: "center",
    color: "inherit",
    display: "inline-flex",
    fontSize: "0.9rem",
    minBlockSize: "var(--plain-link-target-min)",
    minInlineSize: "var(--plain-link-target-min)",
  },
});
