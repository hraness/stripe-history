import {
  deriveNetRevenueHeadlines,
  type HistoryCollection,
  type ResolvedNetRevenueObservation,
} from "@/lib/content";
import type { NetRevenueObservation } from "@/lib/research-schema";
import type { Metadata } from "next";

import { independenceSentence } from "../../site-copy";
import { absoluteSiteUrl, site, socialMetadata } from "../../site";

export const netRevenueScopeLabel: Readonly<
  Record<NetRevenueObservation["scope"], string>
> = {
  company: "company",
  product: "product",
};

export const netRevenuePeriodLabel: Readonly<
  Record<NetRevenueObservation["period"], string>
> = {
  fy: "full year",
  h1: "first half",
  q1: "first quarter",
  "run-rate": "run rate",
};

export const netRevenueMetricLabel: Readonly<
  Record<NetRevenueObservation["metric"], string>
> = {
  cash: "cash",
  "net-revenue": "net revenue",
  revenue: "revenue",
};

export const netRevenueClaimLabel: Readonly<
  Record<NetRevenueObservation["claim"], string>
> = {
  "stated-result": "stated result",
  target: "target",
};

export const netRevenueStatusLabel: Readonly<
  Record<NetRevenueObservation["status"], string>
> = {
  "company-confirmed": "company confirmed",
  reported: "reported",
};

export interface NetRevenuePageSeo {
  readonly description: string;
  readonly lead: string;
  readonly method: string;
  readonly title: string;
  readonly yearRange: string;
}

export interface NetRevenueHeadlineRow {
  readonly calendarYear: number;
  readonly display: string;
  readonly metricLabel: string;
  readonly observationId: string;
  readonly sources: ResolvedNetRevenueObservation["sources"];
  readonly statusLabel: string;
}

function indefiniteArticle(phrase: string): "a" | "an" {
  return /^[aeiou]/iu.test(phrase) ? "an" : "a";
}

function netRevenueYearRange(
  headlines: ReturnType<typeof deriveNetRevenueHeadlines>,
): string {
  const firstHeadline = headlines[0];
  const latestHeadline = headlines.at(-1);
  if (firstHeadline === undefined || latestHeadline === undefined) {
    throw new Error("Net-revenue page requires at least one company full-year observation");
  }
  return firstHeadline.calendarYear === latestHeadline.calendarYear
    ? String(firstHeadline.calendarYear)
    : `${firstHeadline.calendarYear}–${latestHeadline.calendarYear}`;
}

export function deriveNetRevenuePageSeo(
  history: Pick<HistoryCollection, "netRevenues">,
): NetRevenuePageSeo {
  const headlines = deriveNetRevenueHeadlines(history.netRevenues);
  const latestHeadline = headlines.at(-1);
  if (latestHeadline === undefined) {
    throw new Error("Net-revenue page requires at least one company full-year observation");
  }
  const latestObservation = history.netRevenues.find(
    ({ id }) => id === latestHeadline.observationId,
  );
  if (latestObservation === undefined) {
    throw new Error(
      `Net-revenue headline references missing observation ${latestHeadline.observationId}`,
    );
  }
  const yearRange = netRevenueYearRange(headlines);
  const latestMetric = netRevenueMetricLabel[latestObservation.metric];
  const latestStatus = netRevenueStatusLabel[latestObservation.status];
  return {
    description:
      `Sourced Stripe company net-revenue and related financial observations, from the ${latestHeadline.display} ${latestHeadline.calendarYear} ${latestMetric} figure through every other dated dollar claim that can be tied to a named source.`,
    lead: [
      `Stripe’s latest sourced company full-year figure is ${latestHeadline.display} in ${latestHeadline.calendarYear}, recorded as ${latestMetric} with ${indefiniteArticle(latestStatus)} ${latestStatus} status.`,
      `This page lists dated dollar observations and selects one company full-year point per year from ${yearRange}.`,
      "Stripe net revenue is what Stripe keeps after interchange, scheme, and bank-partner fees. It is not payment volume, not the 2.9%+30¢ sticker price, and not net income.",
      independenceSentence,
    ].join(" "),
    method: [
      "Years refer to the calendar period measured, not the later disclosure date.",
      "A numeric USD value appears only when a source states one.",
      "Official Stripe wording is labeled company-confirmed; named reporting is labeled reported.",
      "The Information described the 2025 company figure as revenue, not as Stripe’s “net revenue” phrase.",
      "H1 growth rates stay on the events that disclose them and are not treated as full-year dollar points.",
      "Irish statutory accounts for Stripe Payments International Holdings describe a regional subsidiary’s turnover, not company net revenue, and are not plotted here.",
      "Product-level run-rate targets, including the Revenue suite $1 billion 2026 run rate published with Stripe’s 2025 volume disclosure, remain on those events.",
      "Missing years are gaps. Half-year, quarterly, product, and cash figures are not mixed into the company full-year series.",
    ].join(" "),
    title: `Stripe Net Revenue Observations, ${yearRange}`,
    yearRange,
  };
}

export function deriveNetRevenueHeadlineRows(
  history: Pick<HistoryCollection, "netRevenues">,
): readonly NetRevenueHeadlineRow[] {
  return deriveNetRevenueHeadlines(history.netRevenues).map((headline) => {
    const observation = history.netRevenues.find(
      ({ id }) => id === headline.observationId,
    );
    if (observation === undefined) {
      throw new Error(
        `Net-revenue headline references missing observation ${headline.observationId}`,
      );
    }
    return {
      calendarYear: headline.calendarYear,
      display: headline.display,
      metricLabel: netRevenueMetricLabel[observation.metric],
      observationId: observation.id,
      sources: observation.sources,
      statusLabel: netRevenueStatusLabel[observation.status],
    };
  });
}

export function deriveNetRevenuePageMetadata(
  history: Pick<HistoryCollection, "netRevenues">,
): Metadata {
  const seo = deriveNetRevenuePageSeo(history);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: absoluteSiteUrl("/history/net-revenue") },
    ...socialMetadata(
      `${seo.title} | ${site.domain}`,
      seo.description,
      "/history/net-revenue",
    ),
  };
}
