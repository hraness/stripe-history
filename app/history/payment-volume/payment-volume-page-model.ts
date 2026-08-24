import {
  type AnnualVolumePoint,
  type CategorizedHistoryEvent,
  type HistoryCollection,
} from "@/lib/content";
import type { Metadata } from "next";

import { independenceSentence } from "../../site-copy";
import { site, socialMetadata } from "../../site";

export const volumeKindLabel: Readonly<
  Record<AnnualVolumePoint["kind"], string>
> = {
  "payment-volume": "payment volume",
  "total-volume": "total volume",
};

export const volumeQualifierLabel: Readonly<
  Record<AnnualVolumePoint["qualifier"], string>
> = {
  "lower-bound": "lower bound",
  "published-value": "published value",
};

export interface PaymentVolumeRecord {
  readonly event: CategorizedHistoryEvent;
  readonly kindLabel: string;
  readonly point: AnnualVolumePoint;
  readonly qualifierLabel: string;
}

export interface PaymentVolumePageSeo {
  readonly description: string;
  readonly lead: string;
  readonly method: string;
  readonly title: string;
  readonly yearRange: string;
}

function indefiniteArticle(phrase: string): "a" | "an" {
  return /^[aeiou]/iu.test(phrase) ? "an" : "a";
}

function formatYearList(years: readonly number[]): string {
  const firstYear = years[0];
  if (firstYear === undefined) {
    throw new Error("Year list requires at least one year");
  }
  if (years.length === 1) return String(firstYear);
  const lastYear = years.at(-1);
  if (lastYear === undefined) {
    throw new Error("Year list requires at least one year");
  }
  if (years.length === 2) return `${firstYear} and ${lastYear}`;
  return `${years.slice(0, -1).join(", ")}, and ${lastYear}`;
}

function volumeYearRange(records: readonly PaymentVolumeRecord[]): string {
  const firstRecord = records[0];
  const latestRecord = records.at(-1);
  if (firstRecord === undefined || latestRecord === undefined) {
    throw new Error("Payment volume page requires at least one annual disclosure");
  }
  return firstRecord.point.calendarYear === latestRecord.point.calendarYear
    ? String(firstRecord.point.calendarYear)
    : `${firstRecord.point.calendarYear}–${latestRecord.point.calendarYear}`;
}

function seriesTitle(
  records: readonly PaymentVolumeRecord[],
): "Payment and Total Volume" | "Payment Volume" | "Total Volume" {
  const hasPaymentVolume = records.some(
    ({ point }) => point.kind === "payment-volume",
  );
  const hasTotalVolume = records.some(
    ({ point }) => point.kind === "total-volume",
  );
  if (hasPaymentVolume && hasTotalVolume) return "Payment and Total Volume";
  if (hasTotalVolume) return "Total Volume";
  return "Payment Volume";
}

function valuesStrictlyIncrease(records: readonly PaymentVolumeRecord[]): boolean {
  return records.every(({ point }, index) => {
    if (index === 0) return true;
    const previous = records[index - 1];
    return previous !== undefined && point.valueUsd > previous.point.valueUsd;
  });
}

export function derivePaymentVolumeRecords(
  history: Pick<HistoryCollection, "annualVolumes" | "events">,
): readonly PaymentVolumeRecord[] {
  return history.annualVolumes.map((point) => {
    const event = history.events.find(({ id }) => id === point.eventId);
    if (event === undefined) {
      throw new Error(`Annual volume ${point.eventId} is missing its history event`);
    }
    return {
      event,
      kindLabel: volumeKindLabel[point.kind],
      point,
      qualifierLabel: volumeQualifierLabel[point.qualifier],
    };
  });
}

export function derivePaymentVolumeDisclosures(
  history: Pick<HistoryCollection, "annualVolumes" | "events">,
): readonly PaymentVolumeRecord[] {
  return [...derivePaymentVolumeRecords(history)].toReversed();
}

export function derivePaymentVolumePageSeo(
  history: Pick<HistoryCollection, "annualVolumes" | "events">,
): PaymentVolumePageSeo {
  const records = derivePaymentVolumeRecords(history);
  const firstRecord = records[0];
  const latestRecord = records.at(-1);
  if (firstRecord === undefined || latestRecord === undefined) {
    throw new Error("Payment volume page requires at least one annual disclosure");
  }
  const yearRange = volumeYearRange(records);
  const firstKind = firstRecord.kindLabel;
  const latestKind = latestRecord.kindLabel;
  const latestQualifier = latestRecord.qualifierLabel;
  const hasBothKinds = records.some(({ point }) => point.kind === "payment-volume")
    && records.some(({ point }) => point.kind === "total-volume");
  const lowerBoundYears = records
    .filter(({ point }) => point.qualifier === "lower-bound")
    .map(({ point }) => point.calendarYear);
  const totalVolumeYears = records
    .filter(({ point }) => point.kind === "total-volume")
    .map(({ point }) => point.calendarYear);
  const methodClauses = [
    "Years refer to the calendar year measured, not the later disclosure date.",
    "Values preserve Stripe’s published wording and qualifiers.",
  ];
  if (lowerBoundYears.length > 0) {
    methodClauses.push(
      lowerBoundYears.length === 1
        ? `The ${formatYearList(lowerBoundYears)} figure is a lower bound.`
        : `The ${formatYearList(lowerBoundYears)} figures are lower bounds.`,
    );
  }
  if (totalVolumeYears.length > 0) {
    methodClauses.push(
      totalVolumeYears.length === 1
        ? `Stripe calls the ${formatYearList(totalVolumeYears)} figure “total volume.”`
        : `Stripe calls the ${formatYearList(totalVolumeYears)} figures “total volume.”`,
    );
  }
  methodClauses.push("Missing years are not inferred from rounded growth rates.");
  return {
    description:
      `Stripe annual volume history from ${firstRecord.point.display} ${firstKind} in ${firstRecord.point.calendarYear} through the ${latestRecord.point.display} ${latestRecord.point.calendarYear} ${latestKind}, with source-linked Stripe disclosures.`,
    lead: [
      `Stripe’s latest sourced annual volume disclosure is ${latestRecord.point.display} in ${latestRecord.point.calendarYear}, recorded as ${latestKind} with ${indefiniteArticle(latestQualifier)} ${latestQualifier}.`,
      `This page covers disclosed calendar years from ${yearRange}.`,
      ...(hasBothKinds
        ? ["Payment volume and total volume are not interchangeable."]
        : []),
      valuesStrictlyIncrease(records)
        ? "The disclosed values increase across every year in this series."
        : "The series preserves each disclosed value without inferring a growth trend.",
      independenceSentence,
    ].join(" "),
    method: methodClauses.join(" "),
    title: `Stripe ${seriesTitle(records)} by Year, ${yearRange}`,
    yearRange,
  };
}

export function derivePaymentVolumePageMetadata(
  history: Pick<HistoryCollection, "annualVolumes" | "events">,
): Metadata {
  const seo = derivePaymentVolumePageSeo(history);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: "/history/payment-volume" },
    ...socialMetadata(
      `${seo.title} | ${site.domain}`,
      seo.description,
      "/history/payment-volume",
    ),
  };
}
