import type { CategorizedHistoryEvent } from "@/lib/content";
import { historyCategoryPath } from "@/lib/history-urls";
import Link from "next/link";

import { HistoryCategoryIcon } from "./category-icon";

export function HistoryEventArticle({
  event,
}: Readonly<{
  event: CategorizedHistoryEvent;
}>) {
  const categoryLabel = event.categoryLabel.toLocaleLowerCase("en-US");

  return (
    <article id={event.id}>
      <header>
        <p className="history-event-kicker">
          <time dateTime={event.date}>{event.date}</time>
          <Link
            className="history-event-type"
            data-analytics-event="history filter selected"
            data-analytics-id={event.categoryId}
            data-analytics-kind="history-category"
            href={`${historyCategoryPath(event.categoryId)}#${event.id}`}
          >
            <HistoryCategoryIcon filterId={event.categoryId} />
            <span>{categoryLabel}</span>
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
              {source.publisher}
            </a>
          </span>
        ))}
      </p>
    </article>
  );
}
