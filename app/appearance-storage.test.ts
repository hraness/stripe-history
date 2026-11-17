import { describe, expect, test } from "bun:test";

import { siteLegacyStorageKey, siteModeMirrorKey, sitePalettePreference } from "@/support/appearance-config";
import {
  designPalettes,
  designPaletteStorageKey,
  designThemes,
  type DesignPalettePreference,
} from "@/support/hraness/appearance";
import {
  type AppearanceStorage,
  type AppearanceStorageKeys,
  readAppearancePreference,
  writeAppearancePreference,
} from "@/support/hraness/appearance-controller";

// hraness.com serves this site at /stripe, so both pages share one origin's
// storage: the canonical record and the light or dark mirror.
const keys: AppearanceStorageKeys = {
  storageKey: designPaletteStorageKey,
  legacyStorageKey: siteLegacyStorageKey,
  modeMirrorKey: siteModeMirrorKey,
};
const canonical = keys.storageKey;
const mirror = siteModeMirrorKey;
const legacy = siteLegacyStorageKey;

class MemoryStorage implements AppearanceStorage {
  readonly items = new Map<string, string>();
  constructor(entries: Readonly<Record<string, string | undefined>> = {}) {
    for (const [key, value] of Object.entries(entries)) if (value !== undefined) this.items.set(key, value);
  }
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  setItem(key: string, value: string): void { this.items.set(key, value); }
  removeItem(key: string): void { this.items.delete(key); }
}

class BrokenStorage implements AppearanceStorage {
  getItem(): string | null { throw new Error("denied"); }
  setItem(): void { throw new Error("denied"); }
  removeItem(): void { throw new Error("denied"); }
}

const read = (entries: Readonly<Record<string, string | undefined>>): DesignPalettePreference =>
  readAppearancePreference(new MemoryStorage(entries), keys, sitePalettePreference);
const record = (palette: string, mode: string): string => JSON.stringify({ palette, mode });

const preferences: readonly DesignPalettePreference[] = designPalettes.flatMap((palette) =>
  designThemes.map((mode) => ({ palette, mode })));
// Every kind of stored value: absent, unreadable, incomplete, oversized, and each valid record.
const canonicalValues: readonly (string | undefined)[] = [
  undefined,
  "",
  "not json",
  "\"paper\"",
  "[\"paper\",\"dark\"]",
  JSON.stringify({ palette: "paper" }),
  JSON.stringify({ palette: "sepia", mode: "dark" }),
  JSON.stringify({ palette: "gruvbox", mode: "dark", note: "x".repeat(256) }),
  ...preferences.map(({ palette, mode }) => record(palette, mode)),
];
const modeValues: readonly (string | undefined)[] = [undefined, "light", "dark", "system", "sepia"];

describe("reading a saved appearance", () => {
  test("shares the palette key and the light or dark key with hraness.com", () => {
    expect(designPaletteStorageKey).toBe("hraness-design-palette-v1");
    expect(siteModeMirrorKey).toBe("hraness-theme");
    expect(sitePalettePreference).toEqual({ palette: "paper", mode: "system" });
  });

  test("starts in Paper, System", () => {
    expect(read({})).toEqual({ palette: "paper", mode: "system" });
  });

  test("keeps a light or dark choice made on hraness.com before palettes existed", () => {
    expect(read({ [mirror]: "dark" })).toEqual({ palette: "paper", mode: "dark" });
    expect(read({ [mirror]: "light" })).toEqual({ palette: "paper", mode: "light" });
  });

  test("lets that choice win over the default this site saved on a first visit", () => {
    expect(read({ [canonical]: record("paper", "system"), [mirror]: "dark" })).toEqual({ palette: "paper", mode: "dark" });
  });

  test("keeps any other saved choice, even beside an older light or dark mode", () => {
    expect(read({ [canonical]: record("catppuccin", "system"), [mirror]: "dark" })).toEqual({ palette: "catppuccin", mode: "system" });
    expect(read({ [canonical]: record("paper", "light"), [mirror]: "dark" })).toEqual({ palette: "paper", mode: "light" });
  });

  test("keeps a mode chosen on this site before palettes existed, ahead of the mirror", () => {
    expect(read({ [legacy]: "light", [mirror]: "dark" })).toEqual({ palette: "paper", mode: "light" });
    expect(read({ [legacy]: "dark" })).toEqual({ palette: "paper", mode: "dark" });
  });

  test("ignores the old key once any record exists, and unknown mirror values", () => {
    expect(read({ [canonical]: "not json", [legacy]: "dark" })).toEqual({ palette: "paper", mode: "system" });
    expect(read({ [mirror]: "system" })).toEqual({ palette: "paper", mode: "system" });
    expect(read({ [mirror]: "sepia" })).toEqual({ palette: "paper", mode: "system" });
  });

  test("falls back when storage is missing or denied", () => {
    expect(readAppearancePreference(null, keys, sitePalettePreference)).toEqual(sitePalettePreference);
    expect(readAppearancePreference(new BrokenStorage(), keys, sitePalettePreference)).toEqual(sitePalettePreference);
  });
});

describe("saving an appearance", () => {
  test("keeps the light or dark mirror in step and removes it for System", () => {
    const storage = new MemoryStorage({ [mirror]: "light" });
    writeAppearancePreference(storage, keys, { palette: "gruvbox", mode: "dark" });
    expect(Object.fromEntries(storage.items)).toEqual({ [canonical]: record("gruvbox", "dark"), [mirror]: "dark" });
    writeAppearancePreference(storage, keys, { palette: "gruvbox", mode: "system" });
    expect(Object.fromEntries(storage.items)).toEqual({ [canonical]: record("gruvbox", "system") });
  });

  test("never throws when storage is missing or denied", () => {
    expect(() => writeAppearancePreference(null, keys, sitePalettePreference)).not.toThrow();
    expect(() => writeAppearancePreference(new BrokenStorage(), keys, sitePalettePreference)).not.toThrow();
  });
});

describe("laws over every stored state", () => {
  const states = canonicalValues.flatMap((saved) => modeValues.flatMap((old) => modeValues.map((mirrored) => ({
    [canonical]: saved,
    [legacy]: old,
    [mirror]: mirrored,
  }))));

  test("reads a supported choice from anything stored", () => {
    for (const state of states) {
      const preference = read(state);
      expect(designPalettes).toContain(preference.palette);
      expect(designThemes).toContain(preference.mode);
    }
  });

  test("reads back every choice it saves, whatever was stored before", () => {
    for (const state of states) {
      for (const preference of preferences) {
        const storage = new MemoryStorage(state);
        writeAppearancePreference(storage, keys, preference);
        expect(readAppearancePreference(storage, keys, sitePalettePreference)).toEqual(preference);
      }
    }
  });

  // hraness.com's appearance script reads the same two keys this way. Without
  // this site's pre-palette key, both pages must show the same choice.
  function hranessComRead(storage: AppearanceStorage): DesignPalettePreference {
    const saved = storage.getItem(canonical);
    const mode = storage.getItem(mirror);
    let choice: unknown = null;
    try { if (saved && saved.length <= 256) choice = JSON.parse(saved); } catch { /* An unreadable record is ignored. */ }
    const fields = typeof choice === "object" && choice !== null ? choice as Record<string, unknown> : {};
    const palette = designPalettes.find((id) => id === fields.palette);
    const theme = designThemes.find((id) => id === fields.mode);
    const result: DesignPalettePreference = palette !== undefined && theme !== undefined
      ? { palette, mode: theme }
      : { palette: "paper", mode: "system" };
    if (result.palette === "paper" && result.mode === "system" && (mode === "light" || mode === "dark")) return { palette: "paper", mode };
    return result;
  }

  test("agrees with hraness.com on every shared state", () => {
    for (const saved of canonicalValues) {
      for (const mirrored of modeValues) {
        const storage = new MemoryStorage({ [canonical]: saved, [mirror]: mirrored });
        expect(readAppearancePreference(storage, keys, sitePalettePreference)).toEqual(hranessComRead(storage));
      }
    }
  });
});
