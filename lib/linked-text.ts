import type { CategorizedHistoryEvent } from "./content";
import { historyCategoryPath } from "./history-urls";

/** A record-backed link target: an event anchor or a durable public page. */
export type LinkedTextTarget =
  | { readonly eventId: string; readonly kind: "event" }
  | { readonly kind: "page"; readonly path: "/history/net-revenue" | "/history/payment-volume" | `/history/valuation#${string}` };

export interface LinkedTextPart {
  readonly target?: LinkedTextTarget;
  readonly text: string;
}

export function plainText(parts: readonly LinkedTextPart[]): string {
  return parts.map(({ text }) => text).join("");
}

/** Resolves an event by ID and fails the build when a cited record disappears. */
export function requireEvent(
  events: readonly CategorizedHistoryEvent[],
  id: string,
): CategorizedHistoryEvent {
  const event = events.find((candidate) => candidate.id === id);
  if (event === undefined) throw new Error(`Missing required history event ${id}`);
  return event;
}

/**
 * The app-relative href for a target. Event anchors resolve on the page that
 * renders the event unless a category page is required.
 */
export function linkedTextHref(
  target: LinkedTextTarget,
  events: readonly CategorizedHistoryEvent[],
  anchorPage: "same-page" | "category-page",
): string {
  if (target.kind === "page") return target.path;
  if (anchorPage === "same-page") return `#${target.eventId}`;
  const event = requireEvent(events, target.eventId);
  return `${historyCategoryPath(event.categoryId)}#${event.id}`;
}
