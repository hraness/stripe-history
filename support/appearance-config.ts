import type { DesignPalettePreference } from "./hraness/appearance";

/** Paper in the visitor's system appearance until they choose otherwise. */
export const sitePalettePreference: DesignPalettePreference = Object.freeze({ palette: "paper", mode: "system" });
/** The pre-palette light/dark key, migrated on first save. */
export const siteLegacyStorageKey = "stripe-history-theme-v1";
