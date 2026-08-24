import { loadHistory } from "@/lib/content";
import { historyCategoryPath } from "@/lib/history-urls";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd, historyCollectionJsonLd } from "../../seo";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import { HistoryCategoryIcon } from "../category-icon";
import { HistoryFilters } from "../history-view";
import {
  derivePaymentVolumeDisclosures,
  derivePaymentVolumePageMetadata,
  derivePaymentVolumePageSeo,
  derivePaymentVolumeRecords,
} from "./payment-volume-page-model";

export const dynamic = "force-static";

function partialDateLabel(date: string): string {
  if (date.length === 4) return date;
  if (date.length === 7) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${date}-01T00:00:00Z`));
  }
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export async function generateMetadata(): Promise<Metadata> {
  return derivePaymentVolumePageMetadata(await loadHistory());
}

export default async function PaymentVolumePage() {
  const history = await loadHistory();
  const seo = derivePaymentVolumePageSeo(history);
  const records = derivePaymentVolumeRecords(history);
  const disclosures = derivePaymentVolumeDisclosures(history);
  const maximumValue = Math.max(...records.map(({ point }) => point.valueUsd));

  return (
    <>
      <JsonLdScript
        data={[
          historyCollectionJsonLd(
            records.map(({ event, kindLabel, point }) => ({
              id: event.id,
              title: `${point.calendarYear}: ${point.display} ${kindLabel}`,
            })),
            {
              description: seo.description,
              path: "/history/payment-volume",
              title: seo.title,
            },
          ),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Annual volume", path: "/history/payment-volume" },
          ]),
        ]}
        id="stripedex-payment-volume-structured-data"
      />
      <main
        className="plain-page stripedex-main stripedex-history-main"
        id="main-content"
      >
        <SiteHeader />
        <section
          aria-labelledby="payment-volume-heading"
          className="stripedex-section history-volume-page"
        >
          <h1 className="history-page-title" id="payment-volume-heading">
            {seo.title}
          </h1>
          <HistoryFilters history={history} paymentVolumeSelected />
          <p className="history-volume-intro">
            {seo.lead}
          </p>

          <section
            aria-labelledby="payment-volume-table-heading"
            className="history-volume-table-section"
          >
            <h2 id="payment-volume-table-heading">yearly disclosures</h2>
            <div className="history-volume-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">year</th>
                    <th scope="col">volume</th>
                    <th scope="col">kind</th>
                    <th scope="col">qualifier</th>
                    <th scope="col">sources</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(({ event, kindLabel, point, qualifierLabel }) => (
                    <tr id={event.id} key={event.id}>
                      <th scope="row">{point.calendarYear}</th>
                      <td>{point.display}</td>
                      <td>{kindLabel}</td>
                      <td>{qualifierLabel}</td>
                      <td>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <figure
            aria-labelledby="payment-volume-chart-heading"
            className="history-volume-chart"
          >
            <figcaption>
              <h2 id="payment-volume-chart-heading">volume by year</h2>
              <p>
                {seo.yearRange}, nominal USD. One sourced disclosure per year;
                bars use a linear scale.
              </p>
            </figcaption>
            <ol role="list">
              {records.map(({ kindLabel, point }) => (
                <li key={point.calendarYear}>
                  <a href={`#${point.eventId}`}>
                    <time dateTime={String(point.calendarYear)}>
                      {point.calendarYear}
                    </time>
                    <strong>{point.display}</strong>
                    <span>{kindLabel}</span>
                  </a>
                  <span aria-hidden="true" className="history-volume-chart-track">
                    <span
                      className="history-volume-chart-fill"
                      data-value-usd={point.valueUsd}
                      style={{ inlineSize: `${(point.valueUsd / maximumValue) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          </figure>

          <section
            aria-labelledby="payment-volume-disclosures-heading"
            className="history-volume-disclosures history-volume-table-section"
          >
            <h2 id="payment-volume-disclosures-heading">disclosures and sources</h2>
            <ol className="history-volume-disclosure-list" role="list">
              {disclosures.map(({ event, kindLabel, point, qualifierLabel }) => {
                const categoryLabel = event.categoryLabel.toLocaleLowerCase("en-US");
                return (
                  <li key={event.id}>
                    <article>
                      <header>
                        <p className="history-event-kicker">
                          <time dateTime={event.date}>
                            {partialDateLabel(event.date)}
                          </time>
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
                          <span className="history-event-status">{kindLabel}</span>
                          <span className="history-valuation-basis-badge">
                            {qualifierLabel}
                          </span>
                        </p>
                        <h3>{event.title}</h3>
                      </header>
                      <p>{event.summary}</p>
                      <dl className="history-event-facts">
                        <div>
                          <dt>volume</dt>
                          <dd>{point.display}</dd>
                        </div>
                        <div>
                          <dt>measurement</dt>
                          <dd>{kindLabel}</dd>
                        </div>
                        <div>
                          <dt>qualifier</dt>
                          <dd>{qualifierLabel}</dd>
                        </div>
                        <div>
                          <dt>disclosed</dt>
                          <dd>
                            <time dateTime={event.date}>
                              {partialDateLabel(event.date)}
                            </time>
                          </dd>
                        </div>
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
                  </li>
                );
              })}
            </ol>
          </section>

          <section
            aria-labelledby="payment-volume-method-heading"
            className="history-volume-method"
          >
            <h2 id="payment-volume-method-heading">method</h2>
            <p>{seo.method}</p>
          </section>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
