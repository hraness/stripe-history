import type { CSSProperties } from "react";

import {
  timelineCategoryIds,
  type TimelineCategoryId,
} from "@/lib/history-schema";

export type HistoryFilterVisualId =
  | TimelineCategoryId
  | "all"
  | "net-revenue"
  | "payment-volume"
  | "valuation";

export interface HistoryCategoryVisual {
  readonly paletteIndex: number | null;
}

export const GOLDEN_ANGLE_DEGREES = 137.507_764_05;
export const HISTORY_CATEGORY_HUE_ORIGIN = 275;

const categoryVisuals = {
  // Golden-angle indices keep neighboring hues perceptually separated. Their
  // assignment preserves useful associations: red for acquisitions, blues for
  // people and milestones, greens for payments and products, gold for capital,
  // teal for geography, violet for origins, and magenta for publishing.
  acquisitions: { paletteIndex: 6 },
  appearances: { paletteIndex: 11 },
  "company-milestones": { paletteIndex: 10 },
  "country-expansion": { paletteIndex: 2 },
  "executives-and-team": { paletteIndex: 5 },
  fundraising: { paletteIndex: 1 },
  "headquarters-and-offices": { paletteIndex: 9 },
  "origins-and-early-company": { paletteIndex: 0 },
  "payment-and-payout-expansion": { paletteIndex: 4 },
  "product-launches": { paletteIndex: 7 },
  publishing: { paletteIndex: 3 },
  "side-quests": { paletteIndex: 8 },
} as const satisfies Readonly<Record<TimelineCategoryId, HistoryCategoryVisual>>;

export const historyFilterVisuals = {
  ...categoryVisuals,
  all: { paletteIndex: null },
  "net-revenue": {
    paletteIndex: categoryVisuals["company-milestones"].paletteIndex,
  },
  "payment-volume": {
    paletteIndex: categoryVisuals["payment-and-payout-expansion"].paletteIndex,
  },
  valuation: {
    paletteIndex: categoryVisuals.fundraising.paletteIndex,
  },
} as const satisfies Readonly<Record<HistoryFilterVisualId, HistoryCategoryVisual>>;

export function goldenAngleHue(paletteIndex: number): number {
  const hue = (
    HISTORY_CATEGORY_HUE_ORIGIN + paletteIndex * GOLDEN_ANGLE_DEGREES
  ) % 360;
  return Number(hue.toFixed(3));
}

export function historyCategoryHue(categoryId: TimelineCategoryId): number {
  return goldenAngleHue(categoryVisuals[categoryId].paletteIndex);
}

export function historyFilterVisualStyle(
  filterId: HistoryFilterVisualId,
): CSSProperties & Readonly<{ "--history-category-hue"?: number }> {
  const paletteIndex = historyFilterVisuals[filterId].paletteIndex;
  return paletteIndex === null
    ? {}
    : { "--history-category-hue": goldenAngleHue(paletteIndex) };
}

export function historyCategoryHues(): readonly number[] {
  return timelineCategoryIds.map(historyCategoryHue);
}
