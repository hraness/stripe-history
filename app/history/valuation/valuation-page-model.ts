import {
  deriveValuationHeadlines,
  type HistoryCollection,
  type ResolvedValuationObservation,
} from "@/lib/content";
import type { ValuationObservation } from "@/lib/research-schema";
import type { Metadata } from "next";

import { absoluteSiteUrl, site, socialMetadata } from "../../site";

export const mechanismLabel: Readonly<
  Record<ValuationObservation["mechanism"], string>
> = {
  "company-tender": "company tender",
  "internal-409a": "409A mark",
  "investor-secondary": "investor secondary",
  "primary-financing": "primary financing",
  "secondary-market": "secondary market",
  "seed-financing": "seed financing",
};

export const basisLabel: Readonly<
  Record<ValuationObservation["valuation"]["basis"], string>
> = {
  "common-stock-409a": "common-stock 409A",
  "market-indication": "market indication",
  "post-money": "post-money",
  "pre-money": "pre-money",
  "transaction-implied": "transaction implied",
  unspecified: "basis not specified",
};

export const statusLabel: Readonly<Record<ValuationObservation["status"], string>> = {
  "agreements-signed": "agreements signed",
  "company-confirmed": "company confirmed",
  completed: "completed",
  reported: "reported",
  retrospective: "retrospective",
};

export interface ValuationPageSeo {
  readonly description: string;
  readonly lead: string;
  readonly title: string;
  readonly yearRange: string;
}

export interface ValuationHeadlineRow {
  readonly basisLabel: string;
  readonly calendarYear: number;
  readonly display: string;
  readonly observationId: string;
  readonly sources: ResolvedValuationObservation["sources"];
  readonly statusLabel: string;
}

function latestValuationSource(
  mechanism: string,
  basis: ValuationObservation["valuation"]["basis"],
): string {
  const withArticle = `${indefiniteArticle(mechanism)} ${mechanism}`;
  switch (basis) {
    case "common-stock-409a":
      return `the common-stock value in ${withArticle}`;
    case "market-indication":
      return `a market indication from ${withArticle}`;
    case "post-money":
      return `the post-money value of ${withArticle}`;
    case "pre-money":
      return `the pre-money value of ${withArticle}`;
    case "transaction-implied":
      return `implied by ${withArticle}`;
    case "unspecified":
      return `from ${withArticle}`;
  }
}

function indefiniteArticle(phrase: string): "a" | "an" {
  return /^[aeiou]/iu.test(phrase) ? "an" : "a";
}

function valuationYearRange(
  headlines: ReturnType<typeof deriveValuationHeadlines>,
): string {
  const firstHeadline = headlines[0];
  const latestHeadline = headlines.at(-1);
  if (firstHeadline === undefined || latestHeadline === undefined) {
    throw new Error("Valuation page requires at least one headline observation");
  }
  return firstHeadline.calendarYear === latestHeadline.calendarYear
    ? String(firstHeadline.calendarYear)
    : `${firstHeadline.calendarYear}–${latestHeadline.calendarYear}`;
}

export function deriveValuationPageSeo(
  history: Pick<HistoryCollection, "valuations">,
): ValuationPageSeo {
  const headlines = deriveValuationHeadlines(history.valuations);
  const latestHeadline = headlines.at(-1);
  if (latestHeadline === undefined) {
    throw new Error("Valuation page requires at least one headline observation");
  }
  const latestObservation = history.valuations.find(
    ({ id }) => id === latestHeadline.observationId,
  );
  if (latestObservation === undefined) {
    throw new Error(
      `Valuation headline references missing observation ${latestHeadline.observationId}`,
    );
  }
  const yearRange = valuationYearRange(headlines);
  const latestMechanism = mechanismLabel[latestObservation.mechanism];
  const latestStatus = statusLabel[latestObservation.status];
  const latestSource = latestValuationSource(
    latestMechanism,
    latestObservation.valuation.basis,
  );
  const firstYear = headlines[0]?.calendarYear;
  return {
    description:
      `Stripe’s private valuation by year, from early venture rounds to the ${latestHeadline.display} ${latestHeadline.calendarYear} ${latestMechanism}, with each figure’s type and source labeled.`,
    lead: [
      `Stripe’s latest sourced valuation is ${latestHeadline.display} in ${latestHeadline.calendarYear}, ${latestSource} (${latestStatus}).`,
      firstYear === latestHeadline.calendarYear
        ? `The chart shows one observation for ${firstYear}.`
        : `The chart shows at most one observation per year from ${firstYear} to ${latestHeadline.calendarYear}.`,
      "Financing rounds, tender offers, 409A appraisals, secondary trades, and market signals measure different things, so each figure keeps its label.",
    ].join(" "),
    title: `Stripe valuation history by year, ${yearRange}`,
    yearRange,
  };
}

export function deriveValuationHeadlineRows(
  history: Pick<HistoryCollection, "valuations">,
): readonly ValuationHeadlineRow[] {
  return deriveValuationHeadlines(history.valuations).map((headline) => {
    const observation = history.valuations.find(
      ({ id }) => id === headline.observationId,
    );
    if (observation === undefined) {
      throw new Error(
        `Valuation headline references missing observation ${headline.observationId}`,
      );
    }
    return {
      basisLabel: basisLabel[observation.valuation.basis],
      calendarYear: headline.calendarYear,
      display: headline.display,
      observationId: observation.id,
      sources: observation.sources,
      statusLabel: statusLabel[observation.status],
    };
  });
}

export function deriveValuationPageMetadata(
  history: Pick<HistoryCollection, "valuations">,
): Metadata {
  const seo = deriveValuationPageSeo(history);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: absoluteSiteUrl("/history/valuation") },
    ...socialMetadata(
      `${seo.title} | ${site.name}`,
      seo.description,
      "/history/valuation",
    ),
  };
}
