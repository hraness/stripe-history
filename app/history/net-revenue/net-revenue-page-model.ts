import {
  type AnnualRevenuePoint,
  type CategorizedHistoryEvent,
  type HistoryCollection,
} from "@/lib/content";
import type { Metadata } from "next";

import { independenceSentence } from "../../site-copy";
import { absoluteSiteUrl, site, socialMetadata } from "../../site";

export const revenueKindLabel: Readonly<
  Record<AnnualRevenuePoint["kind"], string>
> = {
  "net-revenue": "net revenue",
  revenue: "revenue",
};

export const revenueQualifierLabel: Readonly<
  Record<AnnualRevenuePoint["qualifier"], string>
> = {
  approximate: "approximate",
  "lower-bound": "lower bound",
  "published-value": "published value",
  reported: "reported",
};

export interface NetRevenueRecord {
  readonly event: CategorizedHistoryEvent;
  readonly kindLabel: string;
  readonly point: AnnualRevenuePoint;
  readonly qualifierLabel: string;
}

export interface NetRevenuePageSeo {
  readonly description: string;
  readonly lead: string;
  readonly method: string;
  readonly title: string;
  readonly yearRange: string;
}

function indefiniteArticle(phrase: string): "a" | "an" {
  return /^[aeiou]/iu.test(phrase) ? "an" : "a";
}

function revenueYearRange(records: readonly NetRevenueRecord[]): string {
  const firstRecord = records[0];
  const latestRecord = records.at(-1);
  if (firstRecord === undefined || latestRecord === undefined) {
    throw new Error("Net-revenue page requires at least one annual disclosure");
  }
  return firstRecord.point.calendarYear === latestRecord.point.calendarYear
    ? String(firstRecord.point.calendarYear)
    : `${firstRecord.point.calendarYear}–${latestRecord.point.calendarYear}`;
}

export function deriveNetRevenueRecords(
  history: Pick<HistoryCollection, "annualRevenues" | "events">,
): readonly NetRevenueRecord[] {
  return history.annualRevenues.map((point) => {
    const event = history.events.find(({ id }) => id === point.eventId);
    if (event === undefined) {
      throw new Error(`Annual revenue ${point.eventId} is missing its history event`);
    }
    return {
      event,
      kindLabel: revenueKindLabel[point.kind],
      point,
      qualifierLabel: revenueQualifierLabel[point.qualifier],
    };
  });
}

export function deriveNetRevenueDisclosures(
  history: Pick<HistoryCollection, "annualRevenues" | "events">,
): readonly NetRevenueRecord[] {
  return [...deriveNetRevenueRecords(history)].toReversed();
}

export function deriveNetRevenuePageSeo(
  history: Pick<HistoryCollection, "annualRevenues" | "events">,
): NetRevenuePageSeo {
  const records = deriveNetRevenueRecords(history);
  const firstRecord = records[0];
  const latestRecord = records.at(-1);
  if (firstRecord === undefined || latestRecord === undefined) {
    throw new Error("Net-revenue page requires at least one annual disclosure");
  }
  const yearRange = revenueYearRange(records);
  const firstKind = firstRecord.kindLabel;
  const latestKind = latestRecord.kindLabel;
  const latestQualifier = latestRecord.qualifierLabel;
  const hasBothKinds = records.some(({ point }) => point.kind === "net-revenue")
    && records.some(({ point }) => point.kind === "revenue");
  return {
    description:
      `Sourced Stripe company net-revenue and revenue disclosures, from ${firstRecord.point.display} ${firstKind} in ${firstRecord.point.calendarYear} through the ${latestRecord.point.display} ${latestRecord.point.calendarYear} ${latestKind} figure.`,
    lead: [
      `Stripe’s latest sourced company full-year figure is ${latestRecord.point.display} in ${latestRecord.point.calendarYear}, recorded as ${latestKind} with ${indefiniteArticle(latestQualifier)} ${latestQualifier} qualifier.`,
      `This page covers disclosed calendar years from ${yearRange}.`,
      "Stripe has no published glossary. The working definition, from Forbes in May 2022, is net revenue as what Stripe keeps after the cut passed to partners such as Visa and Chase.",
      "It is not payment volume, not the 2.9%+30¢ sticker price, not a take rate, not free cash flow, and not net income.",
      ...(hasBothKinds
        ? ["Net revenue and revenue are not interchangeable, and take rates are never computed here."]
        : []),
      independenceSentence,
    ].join(" "),
    method: [
      "Years refer to the calendar year measured, not the later disclosure date.",
      "A numeric USD value appears only when a named source states one.",
      "Confirmed points need a primary or filing source. Reported points need a reporting source.",
      "Stripe has no published glossary for net revenue. The 2021 through 2025 annual letters never use that phrase, and they never state a company net-revenue dollar figure.",
      "The first Stripe-authored use of net revenue as a company KPI is the leaked 19 August 2026 investor letter, which gives first-half growth rates and no dollar total.",
      "The working definition comes from Forbes on 26 May 2022, citing people who had seen the books: “Net revenue, which excludes the cut Stripe passes along to partners like Visa and Chase.” Stripe declined to comment and has not contradicted that definition.",
      "That is the payments-industry standard (the same economic idea as Adyen): fees billed to merchants minus interchange, scheme or network fees, and similar partner costs.",
      "It is not total payment volume, not the 2.9%+30¢ sticker price, not a take rate (Stripe has never published one), not free cash flow, and not net income.",
      "Forbes is the source for the 2021 company figure of nearly $2.5 billion in net revenue. The same piece reported nearly $12 billion in 2021 gross revenue; the gross figure is not plotted.",
      "Axios, citing The Information, described the 2024 company figure as $5.1 billion in revenue next to $2.2 billion in free cash flow. The Information described the 2025 company figure as $6.8 billion in revenue. Neither used Stripe’s “net revenue” phrase.",
      "Related cash and free-cash-flow amounts stay on those disclosure cards. They are not mixed into the company full-year series.",
      "The Q3 2023 figure of roughly $1 billion stays on its timeline event. It is a quarter, not a full-year point.",
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
      "Missing years are gaps. Growth rates are not interpolated into missing years.",
    ].join(" "),
    title: `Stripe Net Revenue and Revenue by Year, ${yearRange}`,
    yearRange,
  };
}

export function deriveNetRevenuePageMetadata(
  history: Pick<HistoryCollection, "annualRevenues" | "events">,
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
