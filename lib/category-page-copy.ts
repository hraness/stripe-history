import { historyCategoryHeading, historyCategoryTitle } from "@/app/site-copy";

import { categoryYearRange } from "./acquisitions-table";
import type { CategorizedHistoryEvent, TimelineCategory } from "./content";
import { publicLaunchYear } from "./origins-lead";

export interface CategoryPageCopy {
  readonly heading: string;
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
        title: `Stripe founding history: founders, first prototype and ${publicLaunchYear(events)} launch`,
      };
    case "acquisitions":
      return {
        heading: "Stripe acquisitions",
        title: `Stripe acquisitions list, ${categoryYearRange(events, "acquisitions")}`,
      };
    case "fundraising":
      return {
        heading: historyCategoryHeading(category.label),
        title: `Stripe funding rounds and tender offers, ${categoryYearRange(events, "fundraising")}`,
      };
    default: {
      const count = events.filter(({ categoryId }) => categoryId === category.id).length;
      return {
        heading: historyCategoryHeading(category.label),
        title: historyCategoryTitle(category.label, count),
      };
    }
  }
}
