"use client";

import { publicSitePath } from "../site";
import type { HistoryFilterVisualId } from "./category-visuals";

/** Share the locked glyph paths across the complete timeline instead of repeating them per event. */
export function HistoryCategoryIcon({
  className,
  filterId,
}: Readonly<{ className?: string | undefined; filterId: HistoryFilterVisualId }>) {
  return (
    <svg
      aria-hidden="true"
      className={`stripe-history-icon history-category-icon${className === undefined ? "" : ` ${className}`}`}
      color="currentColor"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
    >
      <use href={`${publicSitePath("/history-category-icons.svg")}#${filterId}`} />
    </svg>
  );
}
