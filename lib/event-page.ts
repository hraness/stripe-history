import type { CategorizedHistoryEvent, HistoryCollection } from "./content";
import { formatEventDate } from "./event-date";

/** One stable public path per event. Event IDs never change once published. */
export type HistoryEventPath = `/events/${string}`;

const EVENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export const EVENT_PATH_PATTERN = /^\/events\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u;

export function historyEventPath(eventId: string): HistoryEventPath {
  if (!EVENT_ID.test(eventId) || eventId.length > 120) {
    throw new RangeError(`Invalid event ID ${JSON.stringify(eventId)}`);
  }
  return `/events/${eventId}`;
}

/** The event ID in an `/events/<id>` path, without reading the corpus. */
export function eventIdFromPath(pathname: string): string | null {
  const match = EVENT_PATH_PATTERN.exec(pathname);
  return match?.[1] !== undefined && match[1].length <= 120 ? match[1] : null;
}

const DESCRIPTION_MIN = 110;
const DESCRIPTION_MAX = 160;
const ABBREVIATION = /(?:\b(?:Inc|Ltd|Co|Corp|Jr|Sr|St|Mr|Mrs|Ms|Dr|No|vs|approx|ca)|\b[A-Z](?:\.[A-Z])*)\.$/u;

/** Splits one paragraph into sentences without breaking at "U.S." or "Inc.". */
export function sentences(paragraph: string): readonly string[] {
  const parts: string[] = [];
  let current = "";
  for (const piece of paragraph.split(/(?<=[.!?])\s+/u)) {
    current = current === "" ? piece : `${current} ${piece}`;
    if (!ABBREVIATION.test(current)) {
      parts.push(current);
      current = "";
    }
  }
  if (current !== "") parts.push(current);
  return parts;
}

function cutAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  // Leave room for the period added below.
  const slice = text.slice(0, limit);
  const cut = slice.slice(0, slice.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/u, "");
  return /[.!?]$/u.test(cut) ? cut : `${cut}.`;
}

export interface EventDescriptionInput {
  readonly date: string;
  readonly sources: readonly unknown[];
  readonly summary: string;
}

/**
 * A 110–160 character description built from whole sentences of the summary.
 * Falls back to a word boundary only when the first sentence is too long, and
 * adds the dated source count when the first sentence is short.
 */
export function eventMetaDescription(event: EventDescriptionInput): string {
  const [first = event.summary, second] = sentences(event.summary);
  if (first.length > DESCRIPTION_MAX) return cutAtWord(first, DESCRIPTION_MAX);
  if (first.length >= DESCRIPTION_MIN) return first;
  if (second !== undefined && first.length + 1 + second.length <= DESCRIPTION_MAX) {
    return `${first} ${second}`;
  }
  const count = event.sources.length;
  const suffix = `Dated ${formatEventDate(event.date)}, with ${count} linked ${count === 1 ? "source" : "sources"}.`;
  return first.length + 1 + suffix.length <= DESCRIPTION_MAX ? `${first} ${suffix}` : first;
}

/** "Day", "Month", or "Year" precision in reader terms. */
export function datePrecisionNote(precision: CategorizedHistoryEvent["date_precision"]): string {
  switch (precision) {
    case "day":
      return "exact day";
    case "month":
      return "month only; the sources do not give a day";
    case "year":
      return "year only; the sources do not give a month or day";
  }
}

export const confidenceNotes = {
  confirmed: "the linked sources confirm the event",
  disputed: "the linked sources disagree about the event",
  reported: "the linked sources report the event, but it is not confirmed",
} as const satisfies Record<CategorizedHistoryEvent["confidence"], string>;

export interface HistoryEventNeighbors {
  readonly categoryEvents: readonly CategorizedHistoryEvent[];
  readonly event: CategorizedHistoryEvent;
  /** The next event in time within the same category, if any. */
  readonly newer?: CategorizedHistoryEvent;
  /** The previous event in time within the same category, if any. */
  readonly older?: CategorizedHistoryEvent;
  /** Explicitly related records first, then the nearest same-category records. */
  readonly related: readonly CategorizedHistoryEvent[];
}

export const RELATED_EVENT_LIMIT = 5;

/** Category neighbors and related records for one event page. */
export function historyEventNeighbors(
  history: Pick<HistoryCollection, "events">,
  eventId: string,
): HistoryEventNeighbors | undefined {
  const event = history.events.find(({ id }) => id === eventId);
  if (event === undefined) return undefined;
  // `history.events` is reverse-chronological; keep that order.
  const categoryEvents = history.events.filter(({ categoryId }) => categoryId === event.categoryId);
  const index = categoryEvents.indexOf(event);
  const newer = index > 0 ? categoryEvents[index - 1] : undefined;
  const older = categoryEvents[index + 1];
  const byId = new Map(history.events.map((candidate) => [candidate.id, candidate]));
  const explicit = (event.related_events ?? [])
    .map((id) => byId.get(id))
    .filter((candidate): candidate is CategorizedHistoryEvent => candidate !== undefined);
  const seen = new Set([event.id, newer?.id, older?.id, ...explicit.map(({ id }) => id)]);
  const nearby = categoryEvents
    .map((candidate, position) => ({ candidate, distance: Math.abs(position - index) }))
    .filter(({ candidate }) => !seen.has(candidate.id))
    .sort((left, right) => left.distance - right.distance)
    .map(({ candidate }) => candidate);
  return {
    categoryEvents,
    event,
    ...(newer === undefined ? {} : { newer }),
    ...(older === undefined ? {} : { older }),
    related: [...explicit, ...nearby].slice(0, RELATED_EVENT_LIMIT),
  };
}

/** The newest record date in a set of events, for `dateModified`. */
export function newestEventDate(events: readonly Pick<CategorizedHistoryEvent, "date">[]): string | undefined {
  return events.map(({ date }) => date).toSorted().at(-1);
}

/** "Stripe acquires Bridge (October 2024)" unless the title already names the year. */
export function historyEventPageTitle(event: Pick<CategorizedHistoryEvent, "date" | "title">): string {
  return event.title.includes(event.date.slice(0, 4))
    ? event.title
    : `${event.title} (${formatEventDate(event.date)})`;
}
