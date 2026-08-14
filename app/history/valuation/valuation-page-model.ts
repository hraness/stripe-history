import { deriveValuationHeadlines, type HistoryCollection } from "@/lib/content";
import type { ValuationObservation } from "@/lib/research-schema";
import type { Metadata } from "next";

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

export interface ValuationPageSeo {
  readonly description: string;
  readonly title: string;
  readonly yearRange: string;
}

export function deriveValuationPageSeo(
  history: Pick<HistoryCollection, "valuations">,
): ValuationPageSeo {
  const headlines = deriveValuationHeadlines(history.valuations);
  const firstHeadline = headlines[0];
  const latestHeadline = headlines.at(-1);
  if (firstHeadline === undefined || latestHeadline === undefined) {
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
  const yearRange = firstHeadline.calendarYear === latestHeadline.calendarYear
    ? String(firstHeadline.calendarYear)
    : `${firstHeadline.calendarYear}–${latestHeadline.calendarYear}`;
  return {
    description:
      `Stripe valuation history from its early venture rounds through the ${latestHeadline.display} ${latestHeadline.calendarYear} ${mechanismLabel[latestObservation.mechanism]}, with sourced financing, tender, 409A, investor-secondary, and market observations.`,
    title: `Stripe Valuation History by Year, ${yearRange}`,
    yearRange,
  };
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
