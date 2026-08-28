import { describe, expect, test } from "bun:test";
import { timelineCategoryIds } from "@/lib/history-schema";

import {
  GOLDEN_ANGLE_DEGREES,
  goldenAngleHue,
  historyCategoryHues,
  historyFilterVisuals,
} from "./category-visuals";

function circularHueDistance(left: number, right: number): number {
  const distance = Math.abs(left - right);
  return Math.min(distance, 360 - distance);
}

describe("history category visuals", () => {
  test("covers every category with a distinct golden-angle hue", () => {
    const hues = historyCategoryHues();
    expect(hues).toHaveLength(timelineCategoryIds.length);
    expect(new Set(hues).size).toBe(timelineCategoryIds.length);

    const distances = hues.flatMap((hue, index) =>
      hues.slice(index + 1).map((otherHue) =>
        circularHueDistance(hue, otherHue)
      )
    );
    expect(Math.min(...distances)).toBeGreaterThanOrEqual(20);
  });

  test("uses the standard golden-angle recurrence deterministically", () => {
    expect(goldenAngleHue(0)).toBe(275);
    expect(goldenAngleHue(1)).toBe(
      Number(((275 + GOLDEN_ANGLE_DEGREES) % 360).toFixed(3)),
    );
    expect(goldenAngleHue(11)).toBe(347.585);
  });

  test("reuses semantic category hues only for related measures", () => {
    expect(historyFilterVisuals["payment-volume"].paletteIndex).toBe(
      historyFilterVisuals["payment-and-payout-expansion"].paletteIndex,
    );
    expect(historyFilterVisuals["net-revenue"].paletteIndex).toBe(
      historyFilterVisuals["company-milestones"].paletteIndex,
    );
    expect(historyFilterVisuals.valuation.paletteIndex).toBe(
      historyFilterVisuals.fundraising.paletteIndex,
    );
    expect(historyFilterVisuals.all.paletteIndex).toBeNull();
  });
});
