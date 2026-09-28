import { mechanismLabel } from "@/app/history/valuation/valuation-page-model";

import type { HistoryCollection } from "./content";
import { formatEventDate } from "./event-date";
import { type LinkedTextPart, requireEvent } from "./linked-text";
import { ORIGINS_LEAD_EVENT_IDS, requirePrototypeEvent } from "./origins-lead";

export const AT_A_GLANCE_CAPTION = "Stripe at a glance" as const;

export const HEADQUARTERS_EVENT_IDS = {
  dublin: "new-dublin-headquarters-opens",
  southSanFrancisco: "oyster-point-headquarters-occupied",
} as const;

export interface AtAGlanceRow {
  readonly label: string;
  readonly value: readonly LinkedTextPart[];
}

const volumeKindLabel = {
  "payment-volume": "payment volume",
  "total-volume": "total volume",
} as const;

const revenueKindLabel = {
  "net-revenue": "net revenue",
  revenue: "revenue",
} as const;

/** Qualifiers the row must repeat so a reported or bounded figure never reads as disclosed. */
const qualifierNote = {
  approximate: ", approximate",
  "lower-bound": ", lower bound",
  "published-value": "",
  reported: ", reported",
} as const;

function latestByYear<T extends { readonly calendarYear: number }>(
  points: readonly T[],
  name: string,
): T {
  const latest = [...points].sort((left, right) => left.calendarYear - right.calendarYear).at(-1);
  if (latest === undefined) throw new Error(`Stripe at a glance needs at least one ${name}`);
  return latest;
}

function requireLocation(
  history: Pick<HistoryCollection, "events">,
  id: string,
  location: string,
): void {
  const event = requireEvent(history.events, id);
  if (event.locations?.some((value) => value.includes(location)) !== true) {
    throw new Error(`History event ${id} no longer records ${location}`);
  }
}

/**
 * A short fact table generated from records. Each value links to the event or
 * page that supports it, and a missing record fails the build.
 */
export function deriveAtAGlance(
  history: Pick<HistoryCollection, "annualRevenues" | "annualVolumes" | "events" | "valuationHeadlines" | "valuations">,
): readonly AtAGlanceRow[] {
  const prototype = requirePrototypeEvent(history.events);
  const launch = requireEvent(history.events, ORIGINS_LEAD_EVENT_IDS.launch);
  requireLocation(history, HEADQUARTERS_EVENT_IDS.southSanFrancisco, "South San Francisco");
  requireLocation(history, HEADQUARTERS_EVENT_IDS.dublin, "Dublin");
  const volume = latestByYear(history.annualVolumes, "annual volume");
  const revenue = latestByYear(history.annualRevenues, "annual revenue");
  const valuation = latestByYear(history.valuationHeadlines, "valuation headline");
  const observation = history.valuations.find(({ id }) => id === valuation.observationId);
  if (observation === undefined) {
    throw new Error(`Valuation headline references missing observation ${valuation.observationId}`);
  }
  const prototypeLink = { eventId: prototype.id, kind: "event" } as const;

  return [
    {
      label: "Founders",
      value: [{ target: prototypeLink, text: "Patrick and John Collison" }],
    },
    {
      label: "First prototype",
      value: [{ target: prototypeLink, text: `${formatEventDate(prototype.date)}, Buenos Aires` }],
    },
    {
      label: "Public launch",
      value: [{ target: { eventId: launch.id, kind: "event" }, text: formatEventDate(launch.date) }],
    },
    {
      label: "Headquarters",
      value: [
        {
          target: { eventId: HEADQUARTERS_EVENT_IDS.southSanFrancisco, kind: "event" },
          text: "South San Francisco",
        },
        { text: " and " },
        { target: { eventId: HEADQUARTERS_EVENT_IDS.dublin, kind: "event" }, text: "Dublin" },
      ],
    },
    {
      label: "Annual volume",
      value: [{
        target: { kind: "page", path: "/history/payment-volume" },
        text: `${volume.display} ${volumeKindLabel[volume.kind]} (${volume.calendarYear}${qualifierNote[volume.qualifier]})`,
      }],
    },
    {
      label: "Annual revenue",
      value: [{
        target: { kind: "page", path: "/history/net-revenue" },
        text: `${revenue.display} ${revenueKindLabel[revenue.kind]} (${revenue.calendarYear}${qualifierNote[revenue.qualifier]})`,
      }],
    },
    {
      label: "Latest valuation",
      value: [{
        target: { kind: "page", path: `/history/valuation#${valuation.observationId}` },
        text: `${valuation.display} (${valuation.calendarYear}, ${mechanismLabel[observation.mechanism]})`,
      }],
    },
  ];
}
