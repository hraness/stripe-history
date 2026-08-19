import { describe, expect, test } from "bun:test";

import LegacyAppearancesPage from "./page";

describe("legacy appearances route", () => {
  test("permanently redirects into the shared timeline category", () => {
    try {
      LegacyAppearancesPage();
      throw new Error("Expected the legacy appearances route to redirect");
    } catch (error) {
      expect(error).toMatchObject({
        digest: "NEXT_REDIRECT;replace;/history/appearances;308;",
      });
    }
  });
});
