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
  q2: "second quarter",
  q3: "third quarter",
  q4: "fourth quarter",
  "run-rate": "run rate",
};

export const netRevenueMetricLabel: Readonly<
  Record<NetRevenueObservation["metric"], string>
> = {
  cash: "cash",
  fcf: "free cash flow",
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
      "Stripe has no published glossary. The working definition, from Forbes in May 2022, is net revenue as what Stripe keeps after the cut passed to partners such as Visa and Chase.",
      "It is not payment volume, not the 2.9%+30¢ sticker price, not a take rate, not free cash flow, and not net income.",
      independenceSentence,
    ].join(" "),
    method: [
      "Years refer to the calendar period measured, not the later disclosure date.",
      "A numeric USD value appears only when a named source states one.",
      "Official Stripe wording is labeled company-confirmed; named reporting is labeled reported.",
      "Stripe has no published glossary for net revenue. The 2021 through 2025 annual letters never use that phrase, and they never state a company net-revenue dollar figure.",
      "The first Stripe-authored use of net revenue as a company KPI is the leaked 19 August 2026 investor letter, which gives first-half growth rates and no dollar total.",
      "The working definition comes from Forbes on 26 May 2022, citing people who had seen the books: “Net revenue, which excludes the cut Stripe passes along to partners like Visa and Chase.” Stripe declined to comment and has not contradicted that definition.",
      "That is the payments-industry standard (the same economic idea as Adyen): fees billed to merchants minus interchange, scheme or network fees, and similar partner costs.",
      "It is not total payment volume, not the 2.9%+30¢ sticker price, not a take rate (Stripe has never published one), not free cash flow, and not net income.",
      "Forbes is the source for the 2021 company figure of nearly $2.5 billion in net revenue. The same piece reported nearly $12 billion in 2021 gross revenue; the gross figure is not plotted.",
      "Axios, citing The Information, described the 2024 company figure as $5.1 billion in revenue next to $2.2 billion in free cash flow. The Information described the 2025 company figure as $6.8 billion in revenue. Neither used Stripe’s “net revenue” phrase.",
      "The 2025 cash row follows The Information’s public title. The publicly visible dek does not use “free cash flow.”",
      "The Q3 2023 figure of roughly $1 billion is a quarter, not a full-year point.",
      "A later blog attribution of $2 billion in Q1 2026 revenue to The Information is omitted. The publicly visible Information article does not state that quarter.",
      "H1 2026 growth rates stay on the events that disclose them and are not treated as full-year dollar points.",
      "The Wall Street Journal’s 13 April 2021 figure of about $7.4 billion for 2020 “Revenue” is later treated as gross and is not plotted.",
      "Irish statutory accounts for Stripe Payments International Holdings show regional subsidiary turnover of $2.8 billion, $3.82 billion, and $5.12 billion for 2022 through 2024. Those filings cover EMEA and APAC, not the global group. The Information’s 2024 global $5.1 billion (+28%) is close to the 2024 SPIH $5.12 billion (+34%), but the growth rates differ, so the series are not merged.",
      "Restated or unsourced tables from GetLatka, Chargeflow, valueaddvc, and Sacra are excluded. valueaddvc’s claim that the 2025 letter stated $6.9 billion in net revenue is false; that letter does not state a company net-revenue dollar figure.",
      "A derived 2020 net of $1.6 billion and unsourced 2015–2018 volume-blog figures are excluded.",
      "Implied take rates are not plotted. They can be derived only from two sourced points and are not a Stripe disclosure.",
      "Official annual volume stays on the volume record and is not repeated here as revenue.",
      "Official Revenue-suite “revenue run rate” claims ($500 million in the 2023 and 2024 letters, $1 billion on track for 2026 in the 2025 letter) remain on those volume events. They are the same economic idea at product scale, under a different label, and are not company full-year net revenue.",
      "Product-level “$100 million of net revenue” in the 2026 letter is the same metric on a product line and is not a company full-year point.",
      "Missing years are gaps. Half-year, quarterly, product, cash, and free-cash-flow figures are not mixed into the company full-year series. Growth rates are not interpolated into missing years.",
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
