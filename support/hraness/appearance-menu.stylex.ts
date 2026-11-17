import * as stylex from "@stylexjs/stylex";

const forcedColors = "@media (forced-colors: active)";
const reducedMotion = "@media (prefers-reduced-motion: reduce)";
const pressed = ":is([data-pressed], :active)";

export const paletteMenuStyles = stylex.create({
  icon: {
    alignItems: "center",
    display: "inline-flex",
    justifyContent: "center",
    lineHeight: 0,
  },
  root: {
    display: "inline-flex",
    position: "relative",
    "min-inline-size": 0,
  },
  trigger: {
    alignItems: "center",
    // Lantern tokens exist only inside a data-hraness-material="lantern"
    // island, so each chain falls through to the palette outside one.
    backgroundColor: "var(--hraness-material-plane, var(--background, Canvas))",
    borderColor: {
      default: "var(--hraness-material-seam, var(--control-border, GrayText))",
      [forcedColors]: "CanvasText",
    },
    borderRadius: "var(--radius-md, 0.5rem)",
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: {
      default: "var(--hraness-material-raised, none)",
      [pressed]: "var(--hraness-material-inset, none)",
      [forcedColors]: "none",
    },
    color: "var(--hraness-material-ink, var(--foreground, CanvasText))",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    listStyleType: "none",
    "min-block-size": "var(--interactive-target-compact, 2.75rem)",
    "min-inline-size": "var(--interactive-target-compact, 2.75rem)",
    outlineColor: "var(--hraness-material-focus, var(--focus, Highlight))",
    outlineOffset: 3,
    paddingBlock: "0.5rem",
    paddingInline: "0.625rem",
    transitionDuration: {
      default: "120ms",
      [reducedMotion]: "0.01ms",
    },
    transitionProperty: "box-shadow",
    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
    userSelect: "none",
  },
  triggerDefault: {
    "min-block-size": "var(--interactive-target-min, 3rem)",
    "min-inline-size": "var(--interactive-target-min, 3rem)",
  },
  panel: {
    backgroundColor: "var(--hraness-material-plane, var(--popover, Canvas))",
    borderColor: {
      default: "var(--hraness-material-seam, var(--control-border, GrayText))",
      [forcedColors]: "CanvasText",
    },
    borderRadius: "var(--radius-lg, 0.75rem)",
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: {
      default:
        "var(--hraness-material-lift, var(--elevation-overlay, 0 18px 48px -18px rgb(0 0 0 / 32%)))",
      [forcedColors]: "none",
    },
    color: "var(--hraness-material-ink, var(--popover-foreground, CanvasText))",
    display: "grid",
    gap: "0.75rem",
    "inset-block-start": "calc(100% + 0.5rem)",
    "inset-inline-end": 0,
    "inline-size": "min(16rem, calc(100vw - 2rem))",
    "max-block-size": "min(38rem, 75dvh)",
    overflow: "auto",
    paddingBlock: "0.75rem",
    paddingInline: "0.75rem",
    position: "absolute",
    "z-index": "var(--z-tooltip, 3000)",
  },
  group: {
    borderWidth: 0,
    display: "grid",
    gap: "0.125rem",
    marginBlock: 0,
    marginInline: 0,
    "min-inline-size": 0,
    paddingBlock: 0,
    paddingInline: 0,
  },
  legend: {
    color: "var(--muted, GrayText)",
    fontSize: "0.875rem",
    fontWeight: 550,
    lineHeight: 1.5,
    marginBlockEnd: "0.375rem",
    paddingInline: "0.5rem",
  },
  choice: {
    alignItems: "center",
    borderRadius: "var(--radius-md, 0.5rem)",
    cursor: "pointer",
    display: "flex",
    fontSize: "1rem",
    gap: "0.625rem",
    lineHeight: 1.4,
    "min-block-size": "2.75rem",
    paddingBlock: "0.375rem",
    paddingInline: "0.5rem",
  },
  radio: {
    accentColor: "var(--primary, Highlight)",
    flexShrink: 0,
    "block-size": "1rem",
    "inline-size": "1rem",
    marginBlock: 0,
    marginInline: 0,
  },
});
