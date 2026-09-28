import type { CategorizedHistoryEvent } from "./content";
import { eventDatePhrase, eventYear } from "./event-date";
import { type LinkedTextPart, requireEvent } from "./linked-text";

export const ORIGINS_LEAD_EVENT_IDS = {
  fullTime: "origins-founders-go-full-time-and-first-hires-arrive",
  launch: "origins-stripe-public-launch",
  prototype: "origins-buenos-aires-prototype",
  rename: "origins-devpayments-becomes-stripe",
} as const;

export const STRIPE_FOUNDERS = ["Patrick Collison", "John Collison"] as const;

function requirePeople(event: CategorizedHistoryEvent, people: readonly string[]): void {
  for (const person of people) {
    if (event.people?.includes(person) !== true) {
      throw new Error(`History event ${event.id} no longer names ${person}`);
    }
  }
}

function requireLocation(event: CategorizedHistoryEvent, location: string): void {
  if (event.locations?.some((value) => value.startsWith(location)) !== true) {
    throw new Error(`History event ${event.id} no longer records ${location}`);
  }
}

/** The founders' prototype event, checked for the founders and place the copy names. */
export function requirePrototypeEvent(
  events: readonly CategorizedHistoryEvent[],
): CategorizedHistoryEvent {
  const prototype = requireEvent(events, ORIGINS_LEAD_EVENT_IDS.prototype);
  requirePeople(prototype, STRIPE_FOUNDERS);
  requireLocation(prototype, "Buenos Aires");
  return prototype;
}

/**
 * The founding answer for the origins page. Every date comes from its record at
 * the record's precision, and each clause links to the event that supports it.
 */
export function deriveOriginsLead(
  events: readonly CategorizedHistoryEvent[],
): readonly LinkedTextPart[] {
  const prototype = requirePrototypeEvent(events);
  const fullTime = requireEvent(events, ORIGINS_LEAD_EVENT_IDS.fullTime);
  const rename = requireEvent(events, ORIGINS_LEAD_EVENT_IDS.rename);
  const launch = requireEvent(events, ORIGINS_LEAD_EVENT_IDS.launch);
  requirePeople(fullTime, ["John Collison"]);
  if (eventYear(fullTime.date) !== eventYear(prototype.date)) {
    throw new Error("The full-time event must share the prototype year for “that fall”");
  }
  return [
    { text: "Patrick and John Collison " },
    {
      target: { eventId: prototype.id, kind: "event" },
      text: `built Stripe’s first working prototype in Buenos Aires ${eventDatePhrase(prototype.date)}`,
    },
    { text: ". John " },
    {
      target: { eventId: fullTime.id, kind: "event" },
      text: "took leave from Harvard to work on it full time that fall",
    },
    { text: ". The product, first called /dev/payments, " },
    {
      target: { eventId: rename.id, kind: "event" },
      text: `became Stripe ${eventDatePhrase(rename.date)}`,
    },
    { text: " and " },
    {
      target: { eventId: launch.id, kind: "event" },
      text: `launched publicly ${eventDatePhrase(launch.date)}`,
    },
    { text: "." },
  ];
}

export function publicLaunchYear(events: readonly CategorizedHistoryEvent[]): number {
  return eventYear(requireEvent(events, ORIGINS_LEAD_EVENT_IDS.launch).date);
}
