// The palette controller shared by the blocking head bootstrap and the React
// appearance menu. Adapted from the retired @hraness/design-kit (v0.36.3).
import {
  designPaletteBackgrounds,
  designPaletteClassName,
  designPaletteStorageKey,
  designThemeStorageKey,
  isDesignTheme,
  parseDesignPalettePreference,
  resolveDesignPalettePreference,
  type ConcreteDesignPalettePreference,
  type ConcreteDesignTheme,
  type DesignPalettePreference,
} from "./appearance";
import { acquireThemeColorMeta } from "./theme-color-meta";

export interface AppearanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Where a choice is kept. */
export interface AppearanceStorageKeys {
  /** The canonical {"palette", "mode"} record. */
  readonly storageKey: string;
  /** A light, dark or system mode saved before palettes existed, read only while the canonical key is absent. */
  readonly legacyStorageKey: string | null;
  /** Holds the light or dark mode alongside the canonical record, removed for System, for pages that read only the mode. */
  readonly modeMirrorKey: string | null;
}

export interface DesignPaletteSnapshot {
  readonly preference: DesignPalettePreference;
  readonly resolvedMode: ConcreteDesignTheme;
  readonly className: string;
  readonly background: string;
  readonly isForced: boolean;
}

export interface DesignPaletteOptions {
  readonly document?: Document;
  readonly storage?: AppearanceStorage | null;
  readonly storageKey?: string;
  readonly legacyStorageKey?: string | null;
  readonly modeMirrorKey?: string | null;
  readonly defaultPreference?: DesignPalettePreference;
  readonly forcedPreference?: ConcreteDesignPalettePreference;
}

export interface DesignPaletteController {
  readonly getSnapshot: () => DesignPaletteSnapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setPreference: (preference: DesignPalettePreference) => boolean;
  readonly dispose: () => void;
}

interface PaletteInstallation {
  readonly version: 1;
  readonly configuration: string;
  readonly acquire: () => DesignPaletteController;
}

// A document property lets the head bootstrap and a separately bundled React
// client adopt the same controller. Importing this module does not install it.
const installationKey = Symbol.for("hraness.design-palette.controller.v1");
type PaletteDocument = Document & { [installationKey]?: PaletteInstallation };
const darkQuery = "(prefers-color-scheme: dark)";
const defaultPreference: DesignPalettePreference = Object.freeze({ palette: "catppuccin", mode: "dark" });

export function designPaletteSnapshot(
  preference: DesignPalettePreference,
  systemPrefersDark: boolean,
  isForced = false,
): DesignPaletteSnapshot {
  const resolved = resolveDesignPalettePreference(preference, systemPrefersDark);
  return Object.freeze({
    preference: Object.freeze({ ...preference }),
    resolvedMode: resolved.mode,
    className: designPaletteClassName,
    background: designPaletteBackgrounds[resolved.palette][resolved.mode],
    isForced,
  });
}

function readStorage(storage: AppearanceStorage | null, key: string): unknown {
  try { return storage?.getItem(key); } catch { return undefined; }
}

/**
 * The saved choice, or the fallback. Without a canonical record, a mode saved
 * before palettes existed keeps the fallback palette. A record equal to the
 * fallback cannot be told apart from the default this controller saves on a
 * first visit, so a light or dark mode chosen on a page that keeps only the
 * mirror key wins over it.
 */
export function readAppearancePreference(
  storage: AppearanceStorage | null,
  keys: AppearanceStorageKeys,
  fallback: DesignPalettePreference,
): DesignPalettePreference {
  const raw = readStorage(storage, keys.storageKey);
  let preference = parseDesignPalettePreference(raw);
  if (preference === null && (raw === null || raw === undefined) && keys.legacyStorageKey !== null) {
    const legacy = readStorage(storage, keys.legacyStorageKey);
    if (isDesignTheme(legacy)) preference = Object.freeze({ palette: fallback.palette, mode: legacy });
  }
  preference ??= fallback;
  if (keys.modeMirrorKey !== null && preference.palette === fallback.palette && preference.mode === fallback.mode) {
    const mirrored = readStorage(storage, keys.modeMirrorKey);
    if (mirrored === "light" || mirrored === "dark") return Object.freeze({ palette: fallback.palette, mode: mirrored });
  }
  return preference;
}

/** Saves the choice and keeps the mirror in step: light or dark, removed for System. */
export function writeAppearancePreference(
  storage: AppearanceStorage | null,
  keys: AppearanceStorageKeys,
  preference: DesignPalettePreference,
): void {
  if (storage === null) return;
  try {
    storage.setItem(keys.storageKey, JSON.stringify(preference));
    if (keys.modeMirrorKey === null) return;
    if (preference.mode === "system") storage.removeItem(keys.modeMirrorKey);
    else storage.setItem(keys.modeMirrorKey, preference.mode);
  } catch { /* Persistence is optional. */ }
}

/** Installs palette selection explicitly; it never injects scripts or inline styles. */
export function initDesignPalette(options: DesignPaletteOptions = {}): DesignPaletteController {
  const document = options.document ?? globalThis.document;
  if (document === undefined || document.documentElement === null || document.head === null) {
    throw new Error("initDesignPalette requires an HTML document with a head.");
  }
  const view = document.defaultView;
  const storageKey = options.storageKey ?? designPaletteStorageKey;
  const legacyStorageKey = options.legacyStorageKey === undefined ? designThemeStorageKey : options.legacyStorageKey;
  const modeMirrorKey = options.modeMirrorKey ?? null;
  if (storageKey.trim() === "" || legacyStorageKey?.trim() === "" || modeMirrorKey?.trim() === "") {
    throw new Error("Appearance storage keys must not be blank.");
  }
  const keys: AppearanceStorageKeys = { storageKey, legacyStorageKey, modeMirrorKey };
  const fallback = parseDesignPalettePreference(options.defaultPreference) ?? defaultPreference;
  const forced = options.forcedPreference === undefined ? null : parseDesignPalettePreference(options.forcedPreference);
  if (options.forcedPreference !== undefined && (forced === null || forced.mode === "system")) {
    throw new Error("A forced palette requires a valid palette and a light or dark mode.");
  }
  const configuration = JSON.stringify({ storageKey, legacyStorageKey, modeMirrorKey, fallback, forced });
  const ownerDocument = document as PaletteDocument;
  const previous = ownerDocument[installationKey];
  if (previous !== undefined) {
    if (previous.version !== 1 || previous.configuration !== configuration) {
      throw new Error("This document already has a different palette configuration.");
    }
    return previous.acquire();
  }

  let storage = options.storage ?? null;
  const usesDefaultStorage = options.storage === undefined;
  if (usesDefaultStorage && forced === null) {
    try { storage = view?.localStorage ?? null; } catch { /* Storage can be denied. */ }
  }
  let media: MediaQueryList | null = null;
  try { media = view?.matchMedia?.(darkQuery) ?? null; } catch { /* Explicit modes remain available. */ }
  const readPreference = (): DesignPalettePreference => forced ?? readAppearancePreference(storage, keys, fallback);
  let snapshot = designPaletteSnapshot(readPreference(), media?.matches ?? false, forced !== null);
  const listeners = new Set<() => void>();
  const themeColor = acquireThemeColorMeta(document, "theme-color", Symbol("palette-theme-color"), snapshot.background);
  const apply = (): void => {
    const root = document.documentElement;
    root.classList.add(snapshot.className);
    root.setAttribute("data-palette", snapshot.preference.palette);
    root.setAttribute("data-theme", snapshot.resolvedMode);
    themeColor.update(snapshot.background);
  };
  const update = (preference: DesignPalettePreference): boolean => {
    const next = designPaletteSnapshot(preference, media?.matches ?? false, forced !== null);
    if (next.preference.palette === snapshot.preference.palette
      && next.preference.mode === snapshot.preference.mode
      && next.resolvedMode === snapshot.resolvedMode) return false;
    snapshot = next;
    apply();
    for (const listener of listeners) listener();
    return true;
  };
  const onMedia = (): void => { update(snapshot.preference); };
  const onStorage = (event: StorageEvent): void => {
    if (forced !== null) return;
    if (event.key !== null && event.key !== storageKey && event.key !== modeMirrorKey) return;
    if (usesDefaultStorage && event.storageArea !== null && event.storageArea !== undefined && event.storageArea !== storage) return;
    update(readPreference());
  };
  // A page restored from the back-forward cache missed choices made meanwhile,
  // for example on hraness.com after following the header's link there.
  const onPageShow = (event: PageTransitionEvent): void => {
    if (event.persisted) update(readPreference());
  };
  if (forced === null) {
    writeAppearancePreference(storage, keys, snapshot.preference);
    view?.addEventListener("storage", onStorage);
    view?.addEventListener("pageshow", onPageShow);
    media?.addEventListener("change", onMedia);
  }
  let owners = 0;
  const installation: PaletteInstallation = {
    version: 1,
    configuration,
    acquire: () => {
      // An error document can replace the root or reset its server attributes.
      // Restore the current choice without another controller or storage read.
      apply();
      owners += 1;
      let disposed = false;
      const subscriptions = new Set<() => void>();
      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          if (disposed) return () => undefined;
          const subscription = (): void => { listener(); };
          subscriptions.add(subscription);
          listeners.add(subscription);
          return () => { subscriptions.delete(subscription); listeners.delete(subscription); };
        },
        setPreference: (value) => {
          if (disposed || forced !== null) return false;
          const preference = parseDesignPalettePreference(value);
          if (preference === null) throw new Error("Choose a supported palette and appearance mode.");
          writeAppearancePreference(storage, keys, preference);
          return update(preference);
        },
        dispose: () => {
          if (disposed) return;
          disposed = true;
          for (const listener of subscriptions) listeners.delete(listener);
          subscriptions.clear();
          owners -= 1;
          if (owners !== 0) return;
          view?.removeEventListener("storage", onStorage);
          view?.removeEventListener("pageshow", onPageShow);
          media?.removeEventListener("change", onMedia);
          themeColor.release();
          if (ownerDocument[installationKey] === installation) Reflect.deleteProperty(ownerDocument, installationKey);
        },
      };
    },
  };
  ownerDocument[installationKey] = installation;
  return installation.acquire();
}
