import {
  deriveValuationHeadlines,
  type HistoryCollection,
  type ResolvedValuationObservation,
} from "@/lib/content";
import type { ValuationObservation } from "@/lib/research-schema";
import type { Metadata } from "next";

import { independenceSentence } from "../../site-copy";
import { site, socialMetadata } from "../../site";

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
  const latestBasis = basisLabel[latestObservation.valuation.basis];
  return {
    description:
      `Stripe valuation history from its early venture rounds through the ${latestHeadline.display} ${latestHeadline.calendarYear} ${latestMechanism}, with sourced financing, tender, 409A, investor-secondary, and market observations.`,
    lead: [
      `Stripe’s latest sourced private-company valuation headline is ${latestHeadline.display} in ${latestHeadline.calendarYear}, from ${indefiniteArticle(latestMechanism)} ${latestMechanism} with ${latestStatus} status, recorded as ${latestBasis}.`,
      `This page selects one observation per year from ${yearRange}.`,
      "Financing, tender, 409A, secondary, and market-indication figures are not interchangeable.",
      independenceSentence,
    ].join(" "),
    title: `Stripe Valuation History by Year, ${yearRange}`,
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
    alternates: { canonical: "/history/valuation" },
    ...socialMetadata(
      `${seo.title} | ${site.domain}`,
      seo.description,
      "/history/valuation",
    ),
  };
}
