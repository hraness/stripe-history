import * as stylex from "@stylexjs/stylex";

// The sticky marketing header recipe, adapted from the retired
// @hraness/design-kit (v0.36.3) product-marketing styles. The foil stops
// and brand image are the Hraness foil material for the wordmark.
const foilStops = {
  "--_hraness-foil-1": {
    "default": "var(--hraness-foil-1, oklch(0.89 0.065 337))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-1, oklch(0.56 0.16 340))",
  },
  "--_hraness-foil-2": {
    "default": "var(--hraness-foil-2, oklch(0.875 0.05 277))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-2, oklch(0.52 0.15 285))",
  },
  "--_hraness-foil-3": {
    "default": "var(--hraness-foil-3, oklch(0.92 0.05 170))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-3, oklch(0.66 0.14 175))",
  },
  "--_hraness-foil-4": {
    "default": "var(--hraness-foil-4, oklch(0.95 0.045 96))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-4, oklch(0.72 0.13 100))",
  },
  "--_hraness-foil-5": {
    "default": "var(--hraness-foil-5, oklch(0.9 0.05 55))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-5, oklch(0.55 0.15 45))",
  },
  "--_hraness-foil-6": {
    "default": "var(--hraness-foil-6, oklch(0.875 0.06 305))",
    "@media (prefers-color-scheme: dark)": "var(--hraness-foil-6, oklch(0.62 0.16 305))",
  },
};

const foilTextImage = "var(--hraness-foil-image, radial-gradient(ellipse 24% 85% at var(--hraness-foil-x, 50%) var(--hraness-foil-y, 50%), color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 80%, var(--background, Canvas)) 0%, transparent 68%), radial-gradient(ellipse 65% 160% at calc(100% - var(--hraness-foil-x, 50%)) calc(100% - var(--hraness-foil-y, 50%)), color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 98%, var(--background, Canvas)) 0%, transparent 72%), linear-gradient(115deg, color-mix(in srgb, var(--_hraness-foil-1) var(--hraness-foil-reflection, 14%), transparent), color-mix(in srgb, var(--_hraness-foil-2) var(--hraness-foil-reflection, 14%), transparent), color-mix(in srgb, var(--_hraness-foil-3) var(--hraness-foil-reflection, 14%), transparent), color-mix(in srgb, var(--_hraness-foil-4) var(--hraness-foil-reflection, 14%), transparent), color-mix(in srgb, var(--_hraness-foil-5) var(--hraness-foil-reflection, 14%), transparent), color-mix(in srgb, var(--_hraness-foil-6) var(--hraness-foil-reflection, 14%), transparent)), linear-gradient(115deg, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 90%, var(--background, Canvas)) 0%, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 100%, var(--background, Canvas)) 24%, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 86%, var(--background, Canvas)) 39%, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 100%, var(--background, Canvas)) 56%, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 84%, var(--background, Canvas)) 82%, color-mix(in oklch, var(--hraness-foil-text-base, var(--foreground, CanvasText)) 100%, var(--background, Canvas)) 100%))";

export const siteHeaderStyles = stylex.create({
  "header": {
    "--hraness-sticky-offset": "calc(var(--hraness-marketing-header-height, 2.75rem) + 1px)",
    "color": {
      "default": "var(--hraness-marketing-ink)",
      "@media (forced-colors: active)": "CanvasText"
    },
    "font-family": "var(--hraness-marketing-text-font)",
    "position": "sticky",
    "inset-block-start": "0",
    "z-index": "40",
    "border-block-end": { "default": "var(--hraness-marketing-chrome-rule)", "@media (forced-colors: active)": "1px solid CanvasText" },
    "background-color": {
      "default": "var(--hraness-marketing-header-background, var(--hraness-marketing-background))",
      "@media (forced-colors: active)": "Canvas"
    },
    "background-image": {
      "default": "none",
      "@media (forced-colors: active)": "none"
    },
    "background-position": {
      "default": "0% 0%",
      "@media (forced-colors: active)": "0% 0%"
    },
    "background-size": {
      "default": "auto auto",
      "@media (forced-colors: active)": "auto auto"
    },
    "background-repeat": {
      "default": "repeat",
      "@media (forced-colors: active)": "repeat"
    },
    "background-origin": {
      "default": "padding-box",
      "@media (forced-colors: active)": "padding-box"
    },
    "background-clip": {
      "default": "border-box",
      "@media (forced-colors: active)": "border-box"
    },
    "background-attachment": {
      "default": "scroll",
      "@media (forced-colors: active)": "scroll"
    },
    "backdrop-filter": "var(--hraness-marketing-header-backdrop, none)",
    "-webkit-backdrop-filter": "var(--hraness-marketing-header-backdrop, none)",
    "border-top": {
      "@media (forced-colors: active)": "1px solid CanvasText"
    },
    "border-right": {
      "@media (forced-colors: active)": "1px solid CanvasText"
    },
    "border-bottom": {
      "@media (forced-colors: active)": "1px solid CanvasText"
    },
    "border-left": {
      "@media (forced-colors: active)": "1px solid CanvasText"
    },
    "border-image-source": {
      "@media (forced-colors: active)": "none"
    },
    "border-image-slice": {
      "@media (forced-colors: active)": "100%"
    },
    "border-image-width": {
      "@media (forced-colors: active)": "1"
    },
    "border-image-outset": {
      "@media (forced-colors: active)": "0"
    },
    "border-image-repeat": {
      "@media (forced-colors: active)": "stretch"
    },
    "box-shadow": {
      "default": "var(--hraness-marketing-chrome-shadow)",
      "@media (forced-colors: active)": "none"
    }
  },  "header__inner": {
    "display": "flex",
    "inline-size": "min(100%, var(--hraness-marketing-measure))",
    "min-block-size": "var(--hraness-marketing-header-height, 2.75rem)",
    "align-items": "center",
    "gap": {
      "default": "0.5rem 1.25rem",
      "@media (max-width: 48rem)": "0 1rem"
    },
    "margin-inline": "auto",
    "padding-inline": "var(--hraness-marketing-gutter)",
    "flex-wrap": {
      "@media (max-width: 48rem)": "wrap"
    },
    "padding-block": {
      "@media (max-width: 48rem)": "0.25rem 0"
    }
  },  "header__brand": {
    "display": "inline-flex",
    "align-items": "center",
    "gap": "0.4rem",
    "color": {
      "default": "transparent",
      "@media (forced-colors: active)": "CanvasText"
    },
    "min-block-size": {
      "@media (max-width: 48rem)": "2.75rem"
    },
    "min-inline-size": {
      "@media (max-width: 48rem)": "0"
    },
    "font-size": "0.9375rem",
    "font-weight": "700",
    "letter-spacing": "-0.04em",
    "text-decoration": "none",
    ...foilStops,
    "--hraness-foil-glow": {
      "default": "0",
      "@media (hover: hover)": { ":hover": "1" }
    },
    "background-image": {
      "default": foilTextImage,
      "@media (forced-colors: active)": "none"
    },
    "-webkit-background-clip": "text",
    "background-clip": "text",
    "-webkit-text-fill-color": {
      "default": "transparent",
      "@media (forced-colors: active)": "CanvasText"
    },
    "filter": {
      "default": "none",
      "@media (forced-colors: active)": "none"
    }
  },  "header__nav": {
    "display": "flex",
    "flex-wrap": {
      "default": "wrap",
      "@media (max-width: 48rem)": "nowrap"
    },
    "align-items": "center",
    "gap": {
      "default": "0.15rem 1.15rem",
      "@media (max-width: 48rem)": "0 1.25rem"
    },
    "margin-inline-start": {
      "default": "auto",
      "@media (max-width: 48rem)": "calc(-1 * var(--hraness-marketing-gutter))"
    },
    "margin-inline-end": {
      "@media (max-width: 48rem)": "calc(-1 * var(--hraness-marketing-gutter))"
    },
    "order": {
      "@media (max-width: 48rem)": "3"
    },
    "flex-grow": {
      "@media (max-width: 48rem)": "1"
    },
    "flex-shrink": {
      "@media (max-width: 48rem)": "0"
    },
    "flex-basis": {
      "@media (max-width: 48rem)": "100%"
    },
    "padding-block": {
      "@media (max-width: 48rem)": "0.25rem"
    },
    "padding-inline": {
      "@media (max-width: 48rem)": "var(--hraness-marketing-gutter)"
    },
    "overflow-x": {
      "@media (max-width: 48rem)": "auto"
    },
    "scrollbar-width": {
      "@media (max-width: 48rem)": "none"
    },
    "contain": {
      "@media (max-width: 48rem)": "inline-size"
    }
  },  "header__link": {
    "color": {
      "default": "var(--hraness-marketing-muted)",
      ":hover": "var(--hraness-marketing-ink)"
    },
    "display": {
      "@media (max-width: 48rem)": "inline-flex"
    },
    "flex-shrink": {
      "@media (max-width: 48rem)": "0"
    },
    "align-items": {
      "@media (max-width: 48rem)": "center"
    },
    "min-block-size": {
      "@media (max-width: 48rem)": "2.75rem"
    },
    "white-space": {
      "@media (max-width: 48rem)": "nowrap"
    },
    "font-size": "0.85rem",
    "font-weight": "500",
    "text-decoration": "none"
  },  "header__linkCurrent": {
    "color": "var(--hraness-marketing-ink)",
    "display": {
      "@media (max-width: 48rem)": "inline-flex"
    },
    "flex-shrink": {
      "@media (max-width: 48rem)": "0"
    },
    "align-items": {
      "@media (max-width: 48rem)": "center"
    },
    "min-block-size": {
      "@media (max-width: 48rem)": "2.75rem"
    },
    "white-space": {
      "@media (max-width: 48rem)": "nowrap"
    },
    "font-size": "0.85rem",
    "font-weight": "500",
    "text-decoration": "none"
  },  "header__actions": {
    "display": "flex",
    "align-items": "center",
    "gap": "0.5rem",
    "margin-inline-start": {
      "@media (max-width: 48rem)": "auto"
    }
  },});
