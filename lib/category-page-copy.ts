import { historyCategoryHeading, historyCategoryTitle } from "@/app/site-copy";

import { categoryYearRange } from "./acquisitions-table";
import type { CategorizedHistoryEvent, TimelineCategory } from "./content";
import { publicLaunchYear } from "./origins-lead";

export interface CategoryPageCopy {
  readonly heading: string;
  readonly metaDescription?: string;
  readonly metaTitle: string;
  readonly title: string;
}

/**
 * Title and H1 for a category page. Three categories answer a common question
 * directly; the rest keep the generated "<label> history: N sourced events".
 */
export function historyCategoryPageCopy(
  category: Pick<TimelineCategory, "id" | "label">,
  events: readonly CategorizedHistoryEvent[],
): CategoryPageCopy {
  switch (category.id) {
    case "origins-and-early-company":
      return {
        heading: "How Stripe started",
        metaDescription: "How Patrick and John Collison founded Stripe: their first payment prototype, early hires and funding, and the 2011 public launch, with sources.",
        metaTitle: `Stripe founding: founders, first prototype and ${publicLaunchYear(events)} launch`,
        title: `Stripe founding history: founders, first prototype and ${publicLaunchYear(events)} launch`,
      };
    case "acquisitions":
      return {
        heading: "Stripe acquisitions",
        metaTitle: `Stripe acquisitions list, ${categoryYearRange(events, "acquisitions")}`,
        title: `Stripe acquisitions list, ${categoryYearRange(events, "acquisitions")}`,
      };
    case "fundraising":
      return {
        heading: historyCategoryHeading(category.label),
        metaTitle: `Stripe funding rounds and tender offers, ${categoryYearRange(events, "fundraising")}`,
        title: `Stripe funding rounds and tender offers, ${categoryYearRange(events, "fundraising")}`,
      };
    default: {
      const count = events.filter(({ categoryId }) => categoryId === category.id).length;
      return {
        heading: historyCategoryHeading(category.label),
        metaTitle: `Stripe ${category.label.toLocaleLowerCase("en-US")}: ${count} sourced ${count === 1 ? "event" : "events"}`,
        title: historyCategoryTitle(category.label, count),
      };
    }
  }
}
