import type { CategorizedHistoryEvent } from "./content";
import { formatEventDate } from "./event-date";
import { sentences } from "./event-page";

export interface CategoryQuestionEventLink {
  readonly date: string;
  readonly dateLabel: string;
  readonly eventId: string;
  readonly title: string;
}

export interface CategoryQuestion {
  readonly answer: string;
  readonly event?: CategoryQuestionEventLink;
  readonly id: string;
  readonly question: string;
}

function link(event: CategorizedHistoryEvent): CategoryQuestionEventLink {
  return {
    date: event.date,
    dateLabel: formatEventDate(event.date),
    eventId: event.id,
    title: event.title,
  };
}

function countPhrase(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Short record-derived answers for one category page: the newest entry, the
 * earliest entry, and how many entries are confirmed. Every answer comes from
 * the YAML, so it changes when the weekly publication adds an event.
 */
export function deriveCategoryQuestions(
  category: Readonly<{ id: string; label: string }>,
  events: readonly CategorizedHistoryEvent[],
): readonly CategoryQuestion[] {
  // `events` is reverse-chronological, like the rest of the collection.
  const inCategory = events.filter(({ categoryId }) => categoryId === category.id);
  const newest = inCategory[0];
  const oldest = inCategory.at(-1);
  if (newest === undefined || oldest === undefined) return [];
  const topic = category.label.toLocaleLowerCase("en-US");
  const confirmed = inCategory.filter(({ confidence }) => confidence === "confirmed").length;
  const reported = inCategory.filter(({ confidence }) => confidence === "reported").length;
  const disputed = inCategory.filter(({ confidence }) => confidence === "disputed").length;
  const firstYear = oldest.date.slice(0, 4);
  const lastYear = newest.date.slice(0, 4);
  const span = firstYear === lastYear ? `in ${firstYear}` : `from ${firstYear} to ${lastYear}`;
  const caveats = [
    reported === 0 ? undefined : `${reported} ${reported === 1 ? "is" : "are"} reported but not confirmed`,
    disputed === 0 ? undefined : `${disputed} ${disputed === 1 ? "is" : "are"} disputed`,
  ].filter((value): value is string => value !== undefined);
  const caveatText = caveats.length === 0 ? "" : `; ${caveats.join(" and ")}`;
  const [newestLead = newest.summary] = sentences(newest.summary);
  return [
    {
      answer: newestLead,
      event: link(newest),
      id: "newest",
      question: `What is the most recent entry in Stripe's ${topic} history?`,
    },
    {
      answer: "is the earliest dated entry in this category.",
      event: link(oldest),
      id: "earliest",
      question: `When does Stripe's ${topic} history begin?`,
    },
    {
      answer: `${countPhrase(inCategory.length, "sourced event")} dated ${span}. ${confirmed} ${confirmed === 1 ? "is" : "are"} confirmed by the linked sources${caveatText}.`,
      id: "count",
      question: `How many ${topic} events does Stripe History record?`,
    },
  ];
}
