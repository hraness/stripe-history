import { loadHistory } from "@/lib/content";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd, historyCollectionJsonLd } from "../../seo";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import { HistoryFilters } from "../history-view";
import {
  deriveNetRevenueHeadlineRows,
  deriveNetRevenuePageMetadata,
  deriveNetRevenuePageSeo,
  netRevenueClaimLabel,
  netRevenueMetricLabel,
  netRevenuePeriodLabel,
  netRevenueScopeLabel,
  netRevenueStatusLabel,
} from "./net-revenue-page-model";

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
  return deriveNetRevenuePageMetadata(await loadHistory());
}

export default async function NetRevenuePage() {
  const history = await loadHistory();
  const seo = deriveNetRevenuePageSeo(history);
  const headlines = deriveNetRevenueHeadlineRows(history);
  const headlineIds = new Set(headlines.map((row) => row.observationId));
  const maximumValue = Math.max(
    ...history.netRevenueHeadlines.map(({ valueUsd }) => valueUsd),
  );

  return (
    <>
      <JsonLdScript
        data={[
          historyCollectionJsonLd(
            headlines.map((row) => ({
              id: row.observationId,
              title: `${row.calendarYear}: ${row.display}`,
            })),
            {
              description: seo.description,
              path: "/history/net-revenue",
              title: seo.title,
            },
          ),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Net revenue", path: "/history/net-revenue" },
          ]),
        ]}
        id="stripe-history-net-revenue-structured-data"
      />
      <main
        className="plain-page stripe-history-main stripe-history-history-main"
        id="main-content"
      >
        <SiteHeader />
        <section
          aria-labelledby="net-revenue-page-heading"
          className="stripe-history-section history-volume-page"
        >
          <h1 className="history-page-title" id="net-revenue-page-heading">
            {seo.title}
          </h1>
          <HistoryFilters history={history} netRevenueSelected />
          <p className="history-volume-intro">
            {seo.lead}
          </p>

          <section
            aria-labelledby="net-revenue-headlines-heading"
            className="history-volume-table-section"
          >
            <h2 id="net-revenue-headlines-heading">company full-year figures</h2>
            <div className="history-volume-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">year</th>
                    <th scope="col">amount</th>
                    <th scope="col">metric</th>
                    <th scope="col">status</th>
                    <th scope="col">sources</th>
                  </tr>
                </thead>
                <tbody>
                  {headlines.map((row) => (
                    <tr id={row.observationId} key={row.observationId}>
                      <th scope="row">{row.calendarYear}</th>
                      <td>{row.display}</td>
                      <td>{row.metricLabel}</td>
                      <td>{row.statusLabel}</td>
                      <td>
                        {row.sources.map((source, index) => (
                          <span key={source.id}>
                            {index === 0 ? null : <span aria-hidden="true"> · </span>}
                            <a
                              aria-label={`${source.publisher}: ${source.title}`}
                              data-analytics-event="source link opened"
                              data-analytics-id={row.observationId}
                              data-analytics-kind="net-revenue"
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
            aria-labelledby="net-revenue-chart-heading"
            className="history-volume-chart"
          >
            <figcaption>
              <h2 id="net-revenue-chart-heading">company full-year figures by year</h2>
              <p>
                {seo.yearRange}, nominal USD. One sourced company full-year point
                per year; bars use a linear scale. Missing years stay missing.
              </p>
            </figcaption>
            <ol role="list">
              {history.netRevenueHeadlines.map((point) => (
                <li key={point.calendarYear}>
                  <a href={`#${point.observationId}`}>
                    <time dateTime={String(point.calendarYear)}>
                      {point.calendarYear}
                    </time>
                    <strong>{point.display}</strong>
                    <span>{netRevenueStatusLabel[point.status]}</span>
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
            aria-labelledby="net-revenue-observations-heading"
            className="history-valuation-observations history-volume-table-section"
          >
            <h2 id="net-revenue-observations-heading">observations and sources</h2>
            <ol className="history-valuation-observation-list" role="list">
              {history.netRevenues.map((observation) => (
                <li
                  {...(headlineIds.has(observation.id)
                    ? {}
                    : { id: observation.id })}
                  key={observation.id}
                >
                  <article>
                    <header>
                      <p className="history-event-kicker">
                        <time dateTime={observation.period_end}>
                          {partialDateLabel(observation.period_end)}
                        </time>
                        <span className="history-event-status">
                          {netRevenueScopeLabel[observation.scope]}
                        </span>
                        <span className="history-valuation-basis-badge">
                          {netRevenuePeriodLabel[observation.period]}
                        </span>
                        {observation.confidence === "confirmed" ? null : (
                          <span className="history-event-confidence">
                            {observation.confidence}
                          </span>
                        )}
                      </p>
                      <h3>{observation.title}</h3>
                    </header>
                    <p className="history-valuation-note">
                      {observation.source_wording}
                    </p>
                    <dl className="history-event-facts">
                      <div>
                        <dt>amount</dt>
                        <dd>{observation.amount.display}</dd>
                      </div>
                      <div>
                        <dt>metric</dt>
                        <dd>{netRevenueMetricLabel[observation.metric]}</dd>
                      </div>
                      <div>
                        <dt>period</dt>
                        <dd>{netRevenuePeriodLabel[observation.period]}</dd>
                      </div>
                      <div>
                        <dt>status</dt>
                        <dd>{netRevenueStatusLabel[observation.status]}</dd>
                      </div>
                      <div>
                        <dt>claim</dt>
                        <dd>{netRevenueClaimLabel[observation.claim]}</dd>
                      </div>
                      {observation.product === undefined ? null : (
                        <div>
                          <dt>product</dt>
                          <dd>{observation.product}</dd>
                        </div>
                      )}
                      {observation.reported_at === undefined ? null : (
                        <div>
                          <dt>reported</dt>
                          <dd>
                            <time dateTime={observation.reported_at}>
                              {partialDateLabel(observation.reported_at)}
                            </time>
                          </dd>
                        </div>
                      )}
                    </dl>
                    {observation.notes === undefined ? null : (
                      <p className="history-valuation-note">{observation.notes}</p>
                    )}
                    <p className="history-event-sources">
                      {observation.sources.map((source, index) => (
                        <span key={source.id}>
                          {index === 0 ? null : <span aria-hidden="true"> · </span>}
                          <a
                            aria-label={`${source.publisher}: ${source.title}`}
                            data-analytics-event="source link opened"
                            data-analytics-id={observation.id}
                            data-analytics-kind="net-revenue"
                            href={source.url}
                          >
                            {source.publisher}
                          </a>
                        </span>
                      ))}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="net-revenue-method-heading"
            className="history-volume-method"
          >
            <h2 id="net-revenue-method-heading">method</h2>
            <p>{seo.method}</p>
            <p>
              Annual payment and total volume remain on the{" "}
              <Link href="/history/payment-volume">volume record</Link>. Private
              valuation observations remain on the{" "}
              <Link href="/history/valuation">valuation record</Link>.
            </p>
          </section>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
