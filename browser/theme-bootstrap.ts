import { siteLegacyStorageKey, sitePalettePreference } from "../support/appearance-config";
import { initDesignPalette } from "../support/hraness/appearance-controller";

// Bundled as a same-origin classic script and executed before the page paints.
// Paper is the default palette; the legacy mode key migrates on first save.
initDesignPalette({
  defaultPreference: sitePalettePreference,
  legacyStorageKey: siteLegacyStorageKey,
});
