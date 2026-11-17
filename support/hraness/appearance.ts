// Palette and light/dark preferences shared by the head bootstrap and the
// React appearance menu. Adapted from the retired @hraness/design-kit (v0.36.3).

export const designThemes = ["light", "dark", "system"] as const;
export type DesignTheme = (typeof designThemes)[number];
export type ConcreteDesignTheme = Exclude<DesignTheme, "system">;

/** The pre-palette key for a bare light/dark/system mode. */
export const designThemeStorageKey = "hraness-design-theme-v1";
export const designPaletteStorageKey = "hraness-design-palette-v1";

export function isDesignTheme(value: unknown): value is DesignTheme {
  return typeof value === "string" && designThemes.some((theme) => theme === value);
}

export function designThemeLabel(theme: DesignTheme, labels?: Readonly<Partial<Record<DesignTheme, string>>>): string {
  return labels?.[theme] ?? `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`;
}

export const designPalettes = ["catppuccin", "gruvbox", "rose-pine", "tokyo-night", "paper"] as const;
export type DesignPalette = (typeof designPalettes)[number];

export const designPaletteLabels: Readonly<Record<DesignPalette, string>> = {
  catppuccin: "Catppuccin",
  gruvbox: "Gruvbox",
  "rose-pine": "Rosé Pine",
  "tokyo-night": "Tokyo Night",
  paper: "Paper",
};

export function isDesignPalette(value: unknown): value is DesignPalette {
  return typeof value === "string" && designPalettes.some((palette) => palette === value);
}

/**
 * Browser chrome colors. They match `--hraness-palette-background` in
 * palette-system.css, which paints every palette from `data-palette` and
 * `data-theme` on the root element.
 */
export const designPaletteBackgrounds: Readonly<Record<DesignPalette, Readonly<Record<ConcreteDesignTheme, string>>>> = {
  catppuccin: { light: "#eff1f5", dark: "#1e1e2e" },
  gruvbox: { light: "#fbf1c7", dark: "#282828" },
  "rose-pine": { light: "#faf4ed", dark: "#191724" },
  "tokyo-night": { light: "#e1e2e7", dark: "#1a1b26" },
  paper: { light: "#f8f7f4", dark: "#12100f" },
};

/** The root class palette-bridge.css keys on; palette paint comes from data attributes. */
export const designPaletteClassName = "hraness-palette";

export interface DesignPalettePreference {
  readonly palette: DesignPalette;
  readonly mode: DesignTheme;
}

export interface ConcreteDesignPalettePreference extends DesignPalettePreference {
  readonly mode: ConcreteDesignTheme;
}

/** Parses persisted JSON and application values without accepting partial preferences. */
export function parseDesignPalettePreference(value: unknown): DesignPalettePreference | null {
  if (typeof value === "string") {
    if (value.length > 256) return null;
    try { value = JSON.parse(value) as unknown; } catch { return null; }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isDesignPalette(record.palette) || !isDesignTheme(record.mode)) return null;
  return Object.freeze({ palette: record.palette, mode: record.mode });
}

export function resolveDesignPalettePreference(
  preference: DesignPalettePreference,
  systemPrefersDark: boolean,
): ConcreteDesignPalettePreference {
  const mode = preference.mode === "system" ? (systemPrefersDark ? "dark" : "light") : preference.mode;
  return { palette: preference.palette, mode };
}
