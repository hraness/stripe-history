import type { CategorizedHistoryEvent } from "./content";
import { eventYear, formatEventDate } from "./event-date";
import type { TimelineCategoryId } from "./history-schema";

export const FIRST_ACQUISITION_EVENT_ID = "kickoff-acquisition-completed" as const;
export const UNDISCLOSED_PRICE = "Not disclosed" as const;
export const ACQUISITIONS_TABLE_CAPTION = "Stripe acquisition events" as const;

export interface AcquisitionRow {
  readonly date: string;
  readonly dateLabel: string;
  readonly deal: string;
  readonly eventId: string;
  readonly price: string;
  readonly status: string;
}

export interface AcquisitionsSummary {
  readonly lead: string;
  readonly rows: readonly AcquisitionRow[];
}

function categoryEvents(
  events: readonly CategorizedHistoryEvent[],
  categoryId: TimelineCategoryId,
): readonly CategorizedHistoryEvent[] {
  return events.filter((event) => event.categoryId === categoryId);
}

/** "2013–2026" from the oldest and newest events, or one year when they match. */
export function categoryYearRange(
  events: readonly CategorizedHistoryEvent[],
  categoryId: TimelineCategoryId,
): string {
  const years = categoryEvents(events, categoryId).map(({ date }) => eventYear(date));
  if (years.length === 0) throw new Error(`Category ${categoryId} has no events`);
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? String(first) : `${first}–${last}`;
}

/**
 * The acquisitions answer table, newest first. Status is the record's status
 * text verbatim, so reported talks and open agreements never read as completed.
 */
export function deriveAcquisitionsSummary(
  events: readonly CategorizedHistoryEvent[],
): AcquisitionsSummary {
  const acquisitions = [...categoryEvents(events, "acquisitions")].sort(
    (left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id),
  );
  const oldest = acquisitions.at(-1);
  if (oldest?.id !== FIRST_ACQUISITION_EVENT_ID) {
    throw new Error(
      `The oldest acquisition event is ${oldest?.id ?? "missing"}, not ${FIRST_ACQUISITION_EVENT_ID}; revise the acquisitions lead`,
    );
  }
  const rows = acquisitions.map((event) => {
    if (event.status === undefined) {
      throw new Error(`Acquisition event ${event.id} needs a status for the acquisitions table`);
    }
    return {
      date: event.date,
      dateLabel: formatEventDate(event.date),
      deal: event.title,
      eventId: event.id,
      price: event.amount?.display ?? UNDISCLOSED_PRICE,
      status: event.status,
    };
  });
  return {
    lead: `Stripe’s first acquisition was the Kickoff team in ${formatEventDate(oldest.date.slice(0, 7))}. This page lists ${rows.length} acquisition events, from completed deals and team hires to announced agreements and reported talks, each with its status.`,
    rows,
  };
}
