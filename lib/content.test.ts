import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AnnualVolumePoint,
  loadHistory,
  validateAnnualVolumeSeries,
} from "./content";
import { historyCategoryIds } from "./history-schema";

const projectDirectory = dirname(dirname(fileURLToPath(import.meta.url)));

describe("published YAML corpus", () => {
  test("loads every history category as one globally valid collection", async () => {
    const history = await loadHistory(join(projectDirectory, "public", "history"));

    expect(history.categories.map(({ id }) => id).toSorted()).toEqual(
      [...historyCategoryIds].toSorted(),
    );
    expect(history.events.length).toBeGreaterThanOrEqual(200);
    expect(history.events.map(({ date }) => date)).toEqual(
      history.events.map(({ date }) => date).toSorted().reverse(),
    );
    expect(history.annualVolumes).toEqual([
      {
        calendarYear: 2021,
        categoryId: "company-milestones",
        display: "$640 billion+",
        eventId: "milestone-2022-2021-volume-640-billion",
        kind: "payment-volume",
        qualifier: "lower-bound",
        valueUsd: 640_000_000_000,
      },
      {
        calendarYear: 2022,
        categoryId: "company-milestones",
        display: "$817 billion+",
        eventId: "milestone-2023-2022-volume-817-billion",
        kind: "payment-volume",
        qualifier: "lower-bound",
        valueUsd: 817_000_000_000,
      },
      {
        calendarYear: 2023,
        categoryId: "company-milestones",
        display: "$1 trillion",
        eventId: "milestone-2024-2023-volume-1-trillion",
        kind: "payment-volume",
        qualifier: "published-value",
        valueUsd: 1_000_000_000_000,
      },
      {
        calendarYear: 2024,
        categoryId: "company-milestones",
        display: "$1.4 trillion",
        eventId: "milestone-2025-2024-volume-1-4-trillion",
        kind: "payment-volume",
        qualifier: "published-value",
        valueUsd: 1_400_000_000_000,
      },
      {
        calendarYear: 2025,
        categoryId: "company-milestones",
        display: "$1.9 trillion",
        eventId: "milestone-2026-2025-volume-1-9-trillion",
        kind: "total-volume",
        qualifier: "published-value",
        valueUsd: 1_900_000_000_000,
      },
    ]);
  });

  test("orders annual volume years without requiring perpetual growth", () => {
    const point = (
      calendarYear: number,
      valueUsd: number,
    ): AnnualVolumePoint => ({
      calendarYear,
      categoryId: "company-milestones",
      display: `$${valueUsd}`,
      eventId: `volume-${calendarYear}`,
      kind: "payment-volume",
      qualifier: "published-value",
      valueUsd,
    });

    expect(() => validateAnnualVolumeSeries([
      point(2021, 640),
      point(2022, 817),
    ])).not.toThrow();
    expect(() => validateAnnualVolumeSeries([
      point(2022, 817),
      point(2021, 640),
    ])).toThrow("years must be strictly increasing");
    expect(() => validateAnnualVolumeSeries([
      point(2021, 817),
      point(2022, 817),
    ])).not.toThrow();
    expect(() => validateAnnualVolumeSeries([
      point(2021, 817),
      point(2022, 640),
    ])).not.toThrow();
  });
});
