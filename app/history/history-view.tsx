import type {
  AnnualVolumePoint,
  CategorizedHistoryEvent,
  HistoryCollection,
} from "@/lib/content";
import type { HistoryCategoryId } from "@/lib/history-schema";
import Link from "next/link";

import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import { site } from "../site";

interface HistoryViewProps {
  readonly history: HistoryCollection;
  readonly selectedCategoryId?: HistoryCategoryId;
}

interface HistoryFiltersProps {
  readonly history: HistoryCollection;
  readonly paymentVolumeSelected?: boolean;
  readonly selectedCategoryId?: HistoryCategoryId;
}

interface HistoryYear {
  readonly events: readonly CategorizedHistoryEvent[];
  readonly year: string;
}

function categoryHref(
  categoryId: HistoryCategoryId,
): `/history/${HistoryCategoryId}` {
  return `/history/${categoryId}`;
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

function AnnualVolumeSidebar({
  points,
}: Readonly<{ points: readonly AnnualVolumePoint[] }>) {
  if (points.length === 0) return null;
  const maximumValue = Math.max(...points.map(({ valueUsd }) => valueUsd));
  const usesTotalVolumeTerminology = points.some(
    ({ kind }) => kind === "total-volume",
  );

  return (
    <aside aria-labelledby="annual-volume-heading" className="history-volume">
      <figure>
        <figcaption>
          <h2 id="annual-volume-heading">
            <Link href="/history/payment-volume">annual volume</Link>
          </h2>
          <span>annual · USD</span>
        </figcaption>
        <ol className="history-volume-list" role="list">
          {points.map((point) => (
            <li key={point.calendarYear}>
              <a
                aria-label={`${point.calendarYear}: ${point.display} ${point.kind === "total-volume" ? "total volume" : "payment volume"}`}
                href={`/history/${point.categoryId}#${point.eventId}`}
              >
                <span>{point.calendarYear}</span>
                <strong>{point.display}</strong>
                <span aria-hidden="true" className="history-volume-track">
                  <span
                    className="history-volume-fill"
                    style={{ inlineSize: `${(point.valueUsd / maximumValue) * 100}%` }}
                  />
                </span>
              </a>
            </li>
          ))}
        </ol>
        {usesTotalVolumeTerminology ? (
          <p className="history-volume-note">
            Stripe calls the 2025 figure “total volume.”
          </p>
        ) : null}
      </figure>
    </aside>
  );
}

function HistoryEventItem({
  event,
}: Readonly<{ event: CategorizedHistoryEvent }>) {
  const categoryLabel = event.categoryLabel.toLocaleLowerCase("en-US");

  return (
    <li className="history-event" data-category={event.categoryId}>
      <article id={event.id}>
        <header>
          <p className="history-event-kicker">
            <time dateTime={event.date}>{event.date}</time>
            <Link
              className="history-event-type"
              data-analytics-event="history filter selected"
              data-analytics-id={event.categoryId}
              data-analytics-kind="history-category"
              href={`${categoryHref(event.categoryId)}#${event.id}`}
            >
              {categoryLabel}
            </Link>
            {event.status === undefined ? null : (
              <span className="history-event-status">{event.status}</span>
            )}
            {event.confidence === "confirmed" ? null : (
              <span className="history-event-confidence">
                {event.confidence}
              </span>
            )}
          </p>
          <h3>{event.title}</h3>
        </header>
        <p>{event.summary}</p>
        {event.amount === undefined
          && event.metrics === undefined
          && event.details === undefined
          ? null
          : (
            <dl className="history-event-facts">
              {event.amount === undefined ? null : (
                <div>
                  <dt>amount</dt>
                  <dd>{event.amount.display}</dd>
                </div>
              )}
              {event.metrics?.map((metric) => (
                <div key={`${event.id}-${metric.label}`}>
                  <dt>{metric.label}</dt>
                  <dd>
                    {metric.value}
                    {metric.context === undefined ? null : ` · ${metric.context}`}
                  </dd>
                </div>
              ))}
              {event.details?.map((detail) => (
                <div key={`${event.id}-${detail.label}`}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}
        <p className="history-event-sources">
          {event.sources.map((source, index) => (
            <span key={source.url}>
              {index === 0 ? null : <span aria-hidden="true"> · </span>}
              <a
                aria-label={`${source.publisher}: ${source.title}`}
                data-analytics-event="source link opened"
                data-analytics-id={event.id}
                data-analytics-kind="history"
                href={source.url}
              >
                {source.publisher}: {source.title}
              </a>
            </span>
          ))}
        </p>
      </article>
    </li>
  );
}

export function HistoryFilters({
  history,
  paymentVolumeSelected = false,
  selectedCategoryId,
}: HistoryFiltersProps) {
  const eventCountByCategory = new Map(
    history.categories.map(({ id }) => [
      id,
      history.events.filter(({ categoryId }) => categoryId === id).length,
    ]),
  );
  const allSelected = selectedCategoryId === undefined && !paymentVolumeSelected;

  return (
    <nav aria-label="Filter Stripe history" className="history-filters">
      <ul role="list">
        <li>
          <Link
            aria-current={allSelected ? "page" : undefined}
            data-analytics-event="history filter selected"
            data-analytics-id="all"
            data-analytics-kind="history-category"
            href="/"
          >
            <span>all</span>
            <span>{history.events.length}</span>
          </Link>
        </li>
        {history.categories.map((category) => (
          <li key={category.id}>
            <Link
              aria-current={selectedCategoryId === category.id ? "page" : undefined}
              data-analytics-event="history filter selected"
              data-analytics-id={category.id}
              data-analytics-kind="history-category"
              href={categoryHref(category.id)}
            >
              <span>{category.label.toLocaleLowerCase("en-US")}</span>
              <span>{eventCountByCategory.get(category.id)}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            aria-current={paymentVolumeSelected ? "page" : undefined}
            data-analytics-event="history filter selected"
            data-analytics-id="payment-volume"
            data-analytics-kind="history-category"
            href="/history/payment-volume"
          >
            <span>annual volume</span>
            <span>{history.annualVolumes.length}</span>
          </Link>
        </li>
      </ul>
    </nav>
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
      className="plain-page stripe-guide-main stripe-guide-history-main"
      id="main-content"
    >
      <SiteHeader />
      {selectedCategory === undefined ? null : (
        <nav aria-label="Breadcrumb" className="stripe-guide-breadcrumbs">
          <Link href="/">history</Link>
          <span aria-hidden="true"> / </span>
          <span>{selectedCategory.label.toLocaleLowerCase("en-US")}</span>
        </nav>
      )}
      <section aria-labelledby="history-heading" className="stripe-guide-section">
        <div className="stripe-guide-section-heading">
          <h1 id="history-heading">{historyHeading}</h1>
          <span>
            {selectedCategoryId === undefined
              ? `${history.events.length} events`
              : `${visibleEvents.length} of ${history.events.length} events`}
          </span>
        </div>
        {selectedCategoryId === undefined ? (
          <p className="stripe-guide-intro">{site.description}</p>
        ) : null}
        <HistoryFilters
          history={history}
          {...(selectedCategoryId === undefined ? {} : { selectedCategoryId })}
        />
        {selectedCategory === undefined ? null : (
          <p className="history-filter-description">{selectedCategory.description}</p>
        )}
        <div className="history-layout">
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
          <AnnualVolumeSidebar points={history.annualVolumes} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
