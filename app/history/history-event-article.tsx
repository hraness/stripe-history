import type { CategorizedHistoryEvent } from "@/lib/content";
import { historyCategoryPath } from "@/lib/history-urls";
import Link from "next/link";
import * as stylex from "@stylexjs/stylex";

import { HistoryCategoryIcon } from "./category-icon";
import { historyEventStyles as styles } from "./history-event.stylex";

export function HistoryEventArticle({
  event,
}: Readonly<{
  event: CategorizedHistoryEvent;
}>) {
  const categoryLabel = event.categoryLabel.toLocaleLowerCase("en-US");

  return (
    <article id={event.id} {...stylex.props(styles.article)}>
      <header>
        <p className={`history-event-kicker ${stylex.props(styles.kicker).className}`}>
          <time {...stylex.props(styles.date)} dateTime={event.date}>{event.date}</time>
          <Link
            className={`history-event-type ${stylex.props(styles.type).className}`}
            data-analytics-event="history filter selected"
            data-analytics-id={event.categoryId}
            data-analytics-kind="history-category"
            href={`${historyCategoryPath(event.categoryId)}#${event.id}`}
          >
            <HistoryCategoryIcon className={stylex.props(styles.typeIcon).className} filterId={event.categoryId} />
            <span>{categoryLabel}</span>
          </Link>
          {event.status === undefined ? null : (
            <span className={`history-event-status ${stylex.props(styles.status).className}`}>{event.status}</span>
          )}
          {event.confidence === "confirmed" ? null : (
            <span className={`history-event-confidence ${stylex.props(styles.status, styles.confidence).className}`}>
              {event.confidence}
            </span>
          )}
        </p>
        <h3 className={`history-event-title ${stylex.props(styles.title).className}`}>{event.title}</h3>
      </header>
      <p {...stylex.props(styles.summary)}>{event.summary}</p>
      {event.amount === undefined
        && event.metrics === undefined
        && event.details === undefined
        ? null
        : (
          <dl className={`history-event-facts ${stylex.props(styles.facts).className}`}>
            {event.amount === undefined ? null : (
              <div {...stylex.props(styles.factRow)}>
                <dt {...stylex.props(styles.factTerm)}>amount</dt>
                <dd {...stylex.props(styles.factValue)}>{event.amount.display}</dd>
              </div>
            )}
            {event.metrics?.map((metric) => (
              <div {...stylex.props(styles.factRow)} key={`${event.id}-${metric.label}`}>
                <dt {...stylex.props(styles.factTerm)}>{metric.label}</dt>
                <dd {...stylex.props(styles.factValue)}>
                  {metric.value}
                  {metric.context === undefined ? null : ` · ${metric.context}`}
                </dd>
              </div>
            ))}
            {event.details?.map((detail) => (
              <div {...stylex.props(styles.factRow)} key={`${event.id}-${detail.label}`}>
                <dt {...stylex.props(styles.factTerm)}>{detail.label}</dt>
                <dd {...stylex.props(styles.factValue)}>{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
      <p className={`history-event-sources ${stylex.props(styles.sources, styles.summary).className}`}>
        {event.sources.map((source, index) => (
          <span key={source.url}>
            {index === 0 ? null : <span aria-hidden="true"> · </span>}
            <a
              {...stylex.props(styles.sourceLink)}
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
