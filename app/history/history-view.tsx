import type {
  AnnualVolumePoint,
  CategorizedHistoryEvent,
  HistoryCollection,
  NetRevenueHeadlinePoint,
  ValuationHeadlinePoint,
} from "@/lib/content";
import type { TimelineCategoryId } from "@/lib/history-schema";
import { historyCategoryPath } from "@/lib/history-urls";
import Link from "next/link";

import { HistoryEventArticle } from "./history-event-article";

import { HistoryCategoryIcon } from "./category-icon";
import {
  historyFilterVisualStyle,
  type HistoryFilterVisualId,
} from "./category-visuals";
import { HistoryStickyOffsetSync } from "./history-sticky-offset-sync";
import { HistoryMeasureRail } from "./history-measure-rail";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { publicSitePath } from "../site";

interface HistoryViewProps {
  readonly history: HistoryCollection;
  readonly selectedCategoryId?: TimelineCategoryId;
}

interface HistoryFiltersProps {
  readonly history: HistoryCollection;
  readonly netRevenueSelected?: boolean;
  readonly paymentVolumeSelected?: boolean;
  readonly selectedCategoryId?: TimelineCategoryId;
  readonly valuationSelected?: boolean;
}

interface HistoryFilterItem {
  readonly count: number;
  readonly href: "/" | `/history/${string}`;
  readonly id: HistoryFilterVisualId;
  readonly label: string;
  readonly selected: boolean;
}

interface HistoryYear {
  readonly events: readonly CategorizedHistoryEvent[];
  readonly year: string;
}

function categoryHref(
  categoryId: TimelineCategoryId,
): `/history/${TimelineCategoryId}` {
  return historyCategoryPath(categoryId);
}

function groupEventsByYear(
  events: readonly CategorizedHistoryEvent[],
): readonly HistoryYear[] {
  const years = new Map<string, CategorizedHistoryEvent[]>();
  for (const event of events) {
    const year = event.date.slice(0, 4);
    const existing = years.get(year);
    if (existing === undefined) years.set(year, [event]);
    else existing.push(event);
  }
  return [...years].map(([year, yearEvents]) => ({ events: yearEvents, year }));
}

export const valuationTierLabel: Readonly<Record<ValuationHeadlinePoint["tier"], string>> = {
  "financing-tender": "financing / tender",
  "internal-mark": "409A",
  "market-signal": "market signal",
  secondary: "secondary",
};

export function valuationBarPercent(
  valueUsd: number,
  maximumValueUsd: number,
): number {
  if (
    !Number.isFinite(valueUsd)
    || !Number.isFinite(maximumValueUsd)
    || maximumValueUsd <= 0
  ) {
    return 0;
  }
  return Math.max(0, Math.min(100, (valueUsd / maximumValueUsd) * 100));
}

function HistoryMeasuresSidebar({
  annualVolumes,
  netRevenueHeadlines,
  valuationHeadlines,
}: Readonly<{
  annualVolumes: readonly AnnualVolumePoint[];
  netRevenueHeadlines: readonly NetRevenueHeadlinePoint[];
  valuationHeadlines: readonly ValuationHeadlinePoint[];
}>) {
  if (
    annualVolumes.length === 0
    && netRevenueHeadlines.length === 0
    && valuationHeadlines.length === 0
  ) {
    return null;
  }
  const maximumVolume = Math.max(...annualVolumes.map(({ valueUsd }) => valueUsd));
  const maximumNetRevenue = Math.max(
    ...netRevenueHeadlines.map(({ valueUsd }) => valueUsd),
  );
  const maximumValuation = Math.max(
    ...valuationHeadlines.map(({ valueUsd }) => valueUsd),
  );
  return (
    <HistoryMeasureRail>
      {annualVolumes.length === 0 ? null : (
        <figure
          data-measure="payment-volume"
          id="history-measure-payment-volume"
          style={historyFilterVisualStyle("payment-volume")}
        >
          <figcaption>
            <h2 id="annual-volume-heading">
              <Link href="/history/payment-volume">
                <HistoryCategoryIcon filterId="payment-volume" />
                <span>annual volume</span>
              </Link>
            </h2>
            <span>annual · USD</span>
          </figcaption>
          <ol className="history-volume-list" role="list">
            {annualVolumes.map((point) => (
              <li key={point.calendarYear}>
                <a
                  aria-label={`${point.calendarYear}: ${point.display} ${point.kind === "total-volume" ? "total volume" : "payment volume"}`}
                  href={publicSitePath(`/history/${point.categoryId}#${point.eventId}`)}
                >
                  <span>{point.calendarYear}</span>
                  <strong>{point.display}</strong>
                  <span aria-hidden="true" className="history-volume-track">
                    <span
                      className="history-volume-fill"
                      style={{ inlineSize: `${(point.valueUsd / maximumVolume) * 100}%` }}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </figure>
      )}
      {netRevenueHeadlines.length === 0 ? null : (
        <figure
          data-measure="net-revenue"
          id="history-measure-net-revenue"
          style={historyFilterVisualStyle("net-revenue")}
        >
          <figcaption>
            <h2 id="net-revenue-heading">
              <Link href="/history/net-revenue">
                <HistoryCategoryIcon filterId="net-revenue" />
                <span>net revenue</span>
              </Link>
            </h2>
            <span>company full-year · USD</span>
          </figcaption>
          <ol className="history-volume-list" role="list">
            {netRevenueHeadlines.map((point) => (
              <li key={point.calendarYear}>
                <a
                  aria-label={`${point.calendarYear}: ${point.display}, ${point.status === "company-confirmed" ? "company confirmed" : "reported"}`}
                  href={publicSitePath(`/history/net-revenue#${point.observationId}`)}
                >
                  <span>{point.calendarYear}</span>
                  <strong>{point.display}</strong>
                  {point.status === "company-confirmed" ? null : (
                    <span className="history-valuation-badge">
                      reported
                    </span>
                  )}
                  <span aria-hidden="true" className="history-volume-track">
                    <span
                      className="history-volume-fill"
                      style={{ inlineSize: `${(point.valueUsd / maximumNetRevenue) * 100}%` }}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </figure>
      )}
      {valuationHeadlines.length === 0 ? null : (
        <figure
          data-measure="valuation"
          id="history-measure-valuation"
          style={historyFilterVisualStyle("valuation")}
        >
          <figcaption>
            <h2 id="valuation-heading">
              <Link href="/history/valuation">
                <HistoryCategoryIcon filterId="valuation" />
                <span>valuation</span>
              </Link>
            </h2>
            <span>annual headline · USD</span>
          </figcaption>
          <ol className="history-volume-list history-valuation-list" role="list">
            {valuationHeadlines.map((point) => (
              <li key={point.calendarYear}>
                <a
                  aria-label={`${point.calendarYear}: ${point.display}, ${valuationTierLabel[point.tier]}`}
                  href={publicSitePath(`/history/valuation#${point.observationId}`)}
                >
                  <span>{point.calendarYear}</span>
                  <strong>{point.display}</strong>
                  {point.tier === "financing-tender"
                    || point.tier === "market-signal"
                    ? null
                    : (
                      <span
                        className="history-valuation-badge"
                        data-tier={point.tier}
                      >
                        {valuationTierLabel[point.tier]}
                      </span>
                    )}
                  <span aria-hidden="true" className="history-volume-track">
                    <span
                      className="history-volume-fill history-valuation-fill"
                      data-tier={point.tier}
                      data-value-usd={point.valueUsd}
                      style={{
                        inlineSize: `${valuationBarPercent(point.valueUsd, maximumValuation)}%`,
                      }}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </figure>
      )}
    </HistoryMeasureRail>
  );
}

function HistoryEventItem({
  event,
}: Readonly<{ event: CategorizedHistoryEvent }>) {
  return (
    <li
      className="history-event"
      data-category={event.categoryId}
      style={historyFilterVisualStyle(event.categoryId)}
    >
      <HistoryEventArticle event={event} />
    </li>
  );
}

export function HistoryFilters({
  history,
  netRevenueSelected = false,
  paymentVolumeSelected = false,
  selectedCategoryId,
  valuationSelected = false,
}: HistoryFiltersProps) {
  const eventCountByCategory = new Map(
    history.categories.map(({ id }) => [
      id,
      history.events.filter(({ categoryId }) => categoryId === id).length,
    ]),
  );
  const allSelected = selectedCategoryId === undefined
    && !netRevenueSelected
    && !paymentVolumeSelected
    && !valuationSelected;

  const filterItems: readonly HistoryFilterItem[] = [
    {
      count: history.events.length,
      href: "/",
      id: "all",
      label: "all",
      selected: allSelected,
    },
    ...history.categories.map((category) => ({
      count: eventCountByCategory.get(category.id) ?? 0,
      href: categoryHref(category.id),
      id: category.id,
      label: category.label.toLocaleLowerCase("en-US"),
      selected: selectedCategoryId === category.id,
    })),
    {
      count: history.annualVolumes.length,
      href: "/history/payment-volume",
      id: "payment-volume",
      label: "annual volume",
      selected: paymentVolumeSelected,
    },
    {
      count: history.netRevenues.length,
      href: "/history/net-revenue",
      id: "net-revenue",
      label: "net revenue",
      selected: netRevenueSelected,
    },
    {
      count: history.valuations.length,
      href: "/history/valuation",
      id: "valuation",
      label: "valuation",
      selected: valuationSelected,
    },
  ];
  const filterLink = (
    filterId: HistoryFilterVisualId,
    label: string,
    count: number,
    href: "/" | `/history/${string}`,
    selected: boolean,
  ) => {
    const countNoun = filterId === "valuation" || filterId === "net-revenue"
      ? "observations"
      : filterId === "payment-volume"
        ? "annual disclosures"
        : count === 1
          ? "event"
          : "events";
    const deselectsToAll = selected && filterId !== "all";
    const accessibleLabel = deselectsToAll
      ? `${label}: ${count} ${countNoun}, selected; activate to show all history`
      : `${label}: ${count} ${countNoun}`;
    return (
      <Link
        aria-current={selected ? "true" : undefined}
        aria-label={accessibleLabel}
        data-analytics-event="history filter selected"
        data-analytics-id={deselectsToAll ? "all" : filterId}
        data-analytics-kind="history-category"
        data-filter-id={filterId}
        href={deselectsToAll ? "/" : href}
        style={historyFilterVisualStyle(filterId)}
      >
        <HistoryCategoryIcon filterId={filterId} />
        <span className="history-filter-label">{label}</span>
        <span className="history-filter-count">{count}</span>
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Filter Stripe history" className="history-filters">
        <ul role="list">
          {filterItems.map((item) => (
            <li key={item.id}>
              {filterLink(
                item.id,
                item.label,
                item.count,
                item.href,
                item.selected,
              )}
            </li>
          ))}
        </ul>
      </nav>
      <HistoryStickyOffsetSync />
    </>
  );
}

export function HistoryView({
  history,
  selectedCategoryId,
}: HistoryViewProps) {
  const selectedCategory = history.categories.find(
    ({ id }) => id === selectedCategoryId,
  );
  const visibleEvents = selectedCategoryId === undefined
    ? history.events
    : history.events.filter(({ categoryId }) => categoryId === selectedCategoryId);
  const years = groupEventsByYear(visibleEvents);
  const historyHeading = selectedCategory === undefined
    ? "Stripe company history"
    : `Stripe ${selectedCategory.label.toLocaleLowerCase("en-US")} history`;

  return (
    <main
      className="plain-page stripe-history-main stripe-history-history-main"
      id="main-content"
    >
      <SiteHeader />
      <section aria-labelledby="history-heading" className="stripe-history-section">
        <h1 className="stripe-history-visually-hidden" id="history-heading">
          {historyHeading}
        </h1>
        <HistoryFilters
          history={history}
          {...(selectedCategoryId === undefined ? {} : { selectedCategoryId })}
        />
        {selectedCategory === undefined ? null : (
          <p className="history-filter-description">{selectedCategory.description}</p>
        )}
        <div className="history-layout">
          <HistoryMeasuresSidebar
            annualVolumes={history.annualVolumes}
            netRevenueHeadlines={history.netRevenueHeadlines}
            valuationHeadlines={history.valuationHeadlines}
          />
          <div className="history-years">
            {years.map(({ events, year }) => (
              <section
                aria-labelledby={`history-year-${year}`}
                className="history-year"
                key={year}
              >
                <div className="history-year-heading">
                  <h2 id={`history-year-${year}`}>
                    <a href={`#history-year-${year}`}>{year}</a>
                  </h2>
                  <span>{events.length} events</span>
                </div>
                <ol className="history-timeline" role="list">
                  {events.map((event) => (
                    <HistoryEventItem event={event} key={event.id} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
