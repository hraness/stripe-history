import { describe, expect, test } from "bun:test";

import { valuationBarPercent, valuationTierLabel } from "./history-view";

describe("valuation chart scale", () => {
  test("uses a zero-based linear scale", () => {
    const earlyRound = valuationBarPercent(20_000_000, 159_000_000_000);
    const growthRound = valuationBarPercent(20_000_000_000, 159_000_000_000);

    expect(earlyRound).toBeCloseTo((20_000_000 / 159_000_000_000) * 100, 8);
    expect(growthRound).toBeCloseTo((20_000_000_000 / 159_000_000_000) * 100, 8);
    expect(growthRound / earlyRound).toBeCloseTo(1_000, 8);
    expect(valuationBarPercent(159_000_000_000, 159_000_000_000)).toBe(100);
  });

  test("handles boundaries without inventing a visible floor", () => {
    expect(valuationBarPercent(10_000_000, 10_000_000)).toBe(100);
    expect(valuationBarPercent(0, 10_000_000)).toBe(0);
    expect(valuationBarPercent(-1, 10_000_000)).toBe(0);
    expect(valuationBarPercent(20_000_000, 10_000_000)).toBe(100);
    expect(valuationBarPercent(0, 0)).toBe(0);
    expect(valuationBarPercent(Number.NaN, 10_000_000)).toBe(0);
  });

  test("labels financing and tender observations without implying company pricing", () => {
    expect(valuationTierLabel["financing-tender"]).toBe("financing / tender");
    expect(Object.values(valuationTierLabel)).not.toContain("company priced");
  });
});
