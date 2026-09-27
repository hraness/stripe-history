"use client";

import { useEffect, useRef } from "react";

/** Keeps sticky measures and hash targets below the responsive filter rows. */
export function HistoryStickyOffsetSync() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const main = markerRef.current?.closest<HTMLElement>(
      ".stripe-history-history-main",
    );
    const filters = main?.querySelector<HTMLElement>(".history-filters");
    const header = main?.querySelector<HTMLElement>(".stripe-history-header");
    const filterList = filters?.querySelector<HTMLElement>("ul");
    const selectedFilter = filters?.querySelector<HTMLElement>(
      'a[aria-current="true"]',
    );
    if (
      main === null
      || main === undefined
      || filters === null
      || filters === undefined
      || header === null
      || header === undefined
      || filterList === null
      || filterList === undefined
      || selectedFilter === null
      || selectedFilter === undefined
    ) {
      return;
    }

    // Only elements that actually stick contribute to the offset: the header
    // scrolls away on narrow timeline pages, and the filters scroll away on
    // wide ones.
    const stuckHeight = (element: HTMLElement) =>
      getComputedStyle(element).position === "sticky"
        ? element.getBoundingClientRect().height
        : 0;
    const updateOffsets = () => {
      const headerOffset = stuckHeight(header);
      main.style.setProperty(
        "--history-header-offset",
        `${headerOffset}px`,
      );
      main.style.setProperty(
        "--history-filter-stack-offset",
        `${headerOffset + stuckHeight(filters)}px`,
      );
    };
    const updateLayout = () => {
      updateOffsets();
      if (filterList.scrollWidth > filterList.clientWidth + 1) {
        const listRect = filterList.getBoundingClientRect();
        const selectedRect = selectedFilter.getBoundingClientRect();
        filterList.scrollLeft = Math.max(
          0,
          filterList.scrollLeft + selectedRect.left - listRect.left - 4,
        );
      } else {
        filterList.scrollLeft = 0;
      }
    };
    updateLayout();
    const observer = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(updateLayout);
    observer?.observe(filters);
    observer?.observe(header);
    // Crossing a breakpoint can change stickiness without changing size. This
    // path leaves the reader's horizontal filter position alone.
    window.addEventListener("resize", updateOffsets);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateOffsets);
      main.style.removeProperty("--history-header-offset");
      main.style.removeProperty("--history-filter-stack-offset");
    };
  }, []);

  return <span aria-hidden="true" hidden ref={markerRef} />;
}
