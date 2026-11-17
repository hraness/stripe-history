import type { DesignPalettePreference } from "./hraness/appearance";

/** Paper in the visitor's system appearance until they choose otherwise. */
export const sitePalettePreference: DesignPalettePreference = Object.freeze({ palette: "paper", mode: "system" });
/** The pre-palette light/dark key, migrated on first save. */
export const siteLegacyStorageKey = "stripe-history-theme-v1";
/**
 * hraness.com shares the palette key with this site (same origin) and also
 * keeps the light or dark mode here, removed for System: its Donate embed reads
 * only this key, and choices made there before palettes existed live in it.
 */
export const siteModeMirrorKey = "hraness-theme";
