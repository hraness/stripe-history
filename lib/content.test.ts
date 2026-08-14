import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AnnualVolumePoint,
  deriveValuationHeadlines,
  loadHistory,
  validateAnnualVolumeSeries,
  valuationTier,
} from "./content";
import type { ValuationObservation } from "./research-schema";
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
    expect(history.valuations).toHaveLength(25);
    expect(history.valuations.find(({ id }) => id === "valuation-2012-02-series-a")?.status)
      .toBe("reported");
    expect(history.valuations.find(({ id }) => id === "valuation-2023-03-series-i")?.status)
      .toBe("agreements-signed");
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2023-03-series-i",
    )?.financing_amount).toEqual({
      currency: "USD",
      display: "more than $6.5 billion",
      qualifier: "lower-bound",
      stage: "agreements-signed",
      value_usd: 6_500_000_000,
    });
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2014-01-series-c",
    )?.financing_amount).toEqual({
      currency: "USD",
      display: "more than $80 million",
      qualifier: "lower-bound",
      stage: "completed",
      value_usd: 80_000_000,
    });
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2012-02-series-a",
    )?.financing_amount).toEqual({
      currency: "USD",
      display: "$18 million",
      qualifier: "exact",
      stage: "reported-terms",
      value_usd: 18_000_000,
    });
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2011-03-seed",
    )?.financing_amount).toEqual({
      currency: "USD",
      display: "~$2 million",
      qualifier: "approximate",
      stage: "reported-terms",
      value_usd: 2_000_000,
    });
    expect(history.valuations.filter(({ mechanism }) => mechanism === "company-tender"))
      .toHaveLength(3);
    expect(history.valuations.filter(({ mechanism }) => mechanism === "company-tender")
      .every(({ status, valuation }) =>
        status === "agreements-signed" && valuation.basis === "transaction-implied"
      )).toBeTrue();
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2024-09-sequoia-secondary",
    )?.capital_transacted).toEqual({
      currency: "USD",
      display: "$861 million",
      qualifier: "exact",
      value_usd: 861_000_000,
    });
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2022-07-internal-409a",
    )?.source_ids).toContain("source-67de5aa3b7009ba5ed83");
    expect(history.valuations.find(
      ({ id }) => id === "valuation-2022-10-internal-409a",
    )?.source_ids).toContain("source-67de5aa3b7009ba5ed83");
    expect(history.valuationHeadlines).toHaveLength(14);
    expect(history.valuationHeadlines.find(({ calendarYear }) => calendarYear === 2022))
      .toEqual({
        calendarYear: 2022,
        display: "~$74 billion",
        observationId: "valuation-2022-07-internal-409a",
        tier: "internal-mark",
        valueUsd: 74_000_000_000,
      });
    expect(history.valuationHeadlines.at(-1)).toEqual({
      calendarYear: 2026,
      display: "$159 billion",
      observationId: "valuation-2026-02-employee-tender",
      tier: "financing-tender",
      valueUsd: 159_000_000_000,
    });
    expect(history.appearances.map(({ id }) => id)).toContain(
      "appearance-2024-02-patrick-collison-dwarkesh",
    );
    expect(history.appearances.find(
      ({ id }) => id === "appearance-2024-04-patrick-john-collison-sessions-ama",
    )?.duration_precision).toBe("approximate");
    expect(history.appearances.find(
      ({ id }) => id === "appearance-2024-04-patrick-collison-berkeley-haas",
    )).toMatchObject({ date_precision: "month", occurred_at: "2024-04" });
    expect(history.appearances.find(
      ({ id }) => id === "appearance-2012-04-patrick-collison-startup-grind",
    )).toMatchObject({ date_precision: "year", occurred_at: "2012" });
    expect(history.events.find(
      ({ id }) => id === "side-quest-new-aesthetics-grants",
    )).toMatchObject({
      date: "2026-05-25",
      metrics: [{ label: "Grantees funded", value: "28" }],
      sourceIds: [
        "source-4c240f420fc0534fe6af",
        "source-5a2e0ef3c00b4019656f",
      ],
    });
    expect(history.sources.every(({ id }) => /^source-[a-f0-9]{20}$/u.test(id))).toBeTrue();
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

  test("chooses one annual valuation headline by mechanism tier and evidence strength", () => {
    const observation = (
      id: string,
      mechanism: ValuationObservation["mechanism"],
      effectiveDate: string,
      valueUsd: number,
      display: string,
    ): ValuationObservation => ({
      confidence: "reported",
      date_precision: "day",
      effective_date: effectiveDate,
      id,
      mechanism,
      source_ids: ["source-11111111111111111111"],
      status: ["company-tender", "primary-financing", "seed-financing"]
        .includes(mechanism)
        ? "completed"
        : "reported",
      title: `Observation ${id}`,
      valuation: {
        basis: mechanism === "internal-409a"
          ? "common-stock-409a"
          : mechanism === "investor-secondary"
            ? "transaction-implied"
            : mechanism === "secondary-market"
              ? "market-indication"
              : "post-money",
        currency: "USD",
        display,
        precision: "exact-stated",
        qualifier: "exact",
        value_usd: valueUsd,
      },
    });
    const headlines = deriveValuationHeadlines([
      observation(
        "valuation-2024-later-market",
        "secondary-market",
        "2024-12-01",
        90_000_000_000,
        "$90 billion",
      ),
      observation(
        "valuation-2024-earlier-tender",
        "company-tender",
        "2024-02-01",
        65_000_000_000,
        "$65 billion",
      ),
      observation(
        "valuation-2023-lower-financing",
        "primary-financing",
        "2023-03-15",
        50_000_000_000,
        "$50 billion",
      ),
    ]);

    expect(headlines).toEqual([
      {
        calendarYear: 2023,
        display: "$50 billion",
        observationId: "valuation-2023-lower-financing",
        tier: "financing-tender",
        valueUsd: 50_000_000_000,
      },
      {
        calendarYear: 2024,
        display: "$65 billion",
        observationId: "valuation-2024-earlier-tender",
        tier: "financing-tender",
        valueUsd: 65_000_000_000,
      },
    ]);

    expect(valuationTier({
      ...observation(
        "valuation-2025-reported-series",
        "primary-financing",
        "2025-04-01",
        100_000_000_000,
        "$100 billion",
      ),
      status: "reported",
    })).toBe("market-signal");
  });

  test("prefers confirmed and stated observations before recency within a mechanism", () => {
    const observation = (
      id: string,
      effectiveDate: string,
      status: ValuationObservation["status"],
      confidence: ValuationObservation["confidence"],
      inferred: boolean,
    ): ValuationObservation => ({
      confidence,
      date_precision: "day",
      derivation: inferred
        ? {
            formula: "$60 billion × one",
            inputs: [{ label: "reported input", value: "$60 billion" }],
          }
        : undefined,
      effective_date: effectiveDate,
      id,
      mechanism: "internal-409a",
      source_ids: ["source-11111111111111111111"],
      status,
      title: `Observation ${id}`,
      valuation: {
        basis: "common-stock-409a",
        currency: "USD",
        display: inferred ? "~$60 billion" : "$60 billion",
        precision: inferred ? "inferred" : "exact-stated",
        qualifier: inferred ? "approximate" : "exact",
        value_usd: 60_000_000_000,
      },
    });

    expect(deriveValuationHeadlines([
      observation(
        "valuation-2024-late-retrospective",
        "2024-12-01",
        "retrospective",
        "reported",
        false,
      ),
      observation(
        "valuation-2024-earlier-reported",
        "2024-06-01",
        "reported",
        "reported",
        false,
      ),
      observation(
        "valuation-2024-latest-inferred",
        "2024-09-01",
        "reported",
        "reported",
        true,
      ),
    ])[0]?.observationId).toBe("valuation-2024-earlier-reported");

    const reportingOnly = {
      ...observation(
        "valuation-2025-later-reporting",
        "2025-12-01",
        "reported",
        "reported",
        false,
      ),
      sources: [{
        id: "source-11111111111111111111",
        kind: "reporting" as const,
        media_type: "article" as const,
        publisher: "Example News",
        title: "A reported valuation",
        url: "https://example.com/reporting",
      }],
    };
    const primarySource = {
      ...observation(
        "valuation-2025-earlier-primary",
        "2025-06-01",
        "reported",
        "reported",
        false,
      ),
      source_ids: ["source-22222222222222222222"],
      sources: [{
        id: "source-22222222222222222222",
        kind: "primary" as const,
        media_type: "article" as const,
        publisher: "Stripe",
        title: "A company valuation announcement",
        url: "https://stripe.com/example",
      }],
    };
    expect(deriveValuationHeadlines([
      reportingOnly,
      primarySource,
    ])[0]?.observationId).toBe("valuation-2025-earlier-primary");
  });
});
