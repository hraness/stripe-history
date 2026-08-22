import {
  loadHistory,
  valuationTier,
} from "@/lib/content";
import type { ValuationObservation } from "@/lib/research-schema";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";

import { breadcrumbJsonLd, historyCollectionJsonLd } from "../../seo";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import {
  HistoryFilters,
  valuationBarPercent,
  valuationTierLabel,
} from "../history-view";
import {
  basisLabel,
  deriveValuationHeadlineRows,
  deriveValuationPageMetadata,
  deriveValuationPageSeo,
  mechanismLabel,
  statusLabel,
} from "./valuation-page-model";

export const dynamic = "force-static";

const financingStageLabel: Readonly<Record<
  NonNullable<ValuationObservation["financing_amount"]>["stage"],
  string
>> = {
  "agreements-signed": "signed agreements",
  completed: "completed financing",
  "reported-terms": "reported terms",
};

export async function generateMetadata(): Promise<Metadata> {
  return deriveValuationPageMetadata(await loadHistory());
}

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

export default async function ValuationPage() {
  const history = await loadHistory();
  const seo = deriveValuationPageSeo(history);
  const headlines = deriveValuationHeadlineRows(history);
  const headlineIds = new Set(headlines.map((row) => row.observationId));
  const maximumValue = Math.max(
    ...history.valuationHeadlines.map(({ valueUsd }) => valueUsd),
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
              path: "/history/valuation",
              title: seo.title,
            },
          ),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Valuation", path: "/history/valuation" },
          ]),
        ]}
        id="stripedex-valuation-structured-data"
      />
      <main
        className="plain-page stripedex-main stripedex-history-main"
        id="main-content"
      >
        <SiteHeader />
        <section
          aria-labelledby="valuation-page-heading"
          className="stripedex-section history-volume-page"
        >
          <h1 className="history-page-title" id="valuation-page-heading">
            {seo.title}
          </h1>
          <HistoryFilters history={history} valuationSelected />
          <p className="history-volume-intro">
            {seo.lead}
          </p>

          <section
            aria-labelledby="valuation-headlines-heading"
            className="history-volume-table-section"
          >
            <h2 id="valuation-headlines-heading">yearly headlines</h2>
            <div className="history-volume-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">year</th>
                    <th scope="col">valuation</th>
                    <th scope="col">basis</th>
                    <th scope="col">status</th>
                    <th scope="col">sources</th>
                  </tr>
                </thead>
                <tbody>
                  {headlines.map((row) => (
                    <tr id={row.observationId} key={row.observationId}>
                      <th scope="row">{row.calendarYear}</th>
                      <td>{row.display}</td>
                      <td>{row.basisLabel}</td>
                      <td>{row.statusLabel}</td>
                      <td>
                        {row.sources.map((source, index) => (
                          <span key={source.id}>
                            {index === 0 ? null : <span aria-hidden="true"> · </span>}
                            <a
                              aria-label={`${source.publisher}: ${source.title}`}
                              data-analytics-event="source link opened"
                              data-analytics-id={row.observationId}
                              data-analytics-kind="valuation"
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
            aria-labelledby="valuation-chart-heading"
            className="history-valuation-chart history-volume-chart"
          >
            <figcaption>
              <h2 id="valuation-chart-heading">valuation by year</h2>
              <p>
                {seo.yearRange}, nominal USD. One selected observation per year;
                bars use a linear scale.
              </p>
            </figcaption>
            <ol role="list">
              {history.valuationHeadlines.map((point) => (
                <li key={point.calendarYear}>
                  <a href={`#${point.observationId}`}>
                    <time dateTime={String(point.calendarYear)}>
                      {point.calendarYear}
                    </time>
                    <strong>{point.display}</strong>
                    <span
                      className="history-valuation-badge"
                      data-tier={point.tier}
                    >
                      {valuationTierLabel[point.tier]}
                    </span>
                  </a>
                  <span aria-hidden="true" className="history-volume-chart-track">
                    <span
                      className="history-valuation-fill history-volume-chart-fill"
                      data-tier={point.tier}
                      data-value-usd={point.valueUsd}
                      style={{
                        inlineSize: `${valuationBarPercent(point.valueUsd, maximumValue)}%`,
                      }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          </figure>

          <section
            aria-labelledby="valuation-observations-heading"
            className="history-valuation-observations history-volume-table-section"
          >
            <h2 id="valuation-observations-heading">observations and sources</h2>
            <ol className="history-valuation-observation-list" role="list">
              {history.valuations.map((observation) => {
                const tier = valuationTier(observation);
                return (
                  <li
                    {...(headlineIds.has(observation.id)
                      ? {}
                      : { id: observation.id })}
                    key={observation.id}
                  >
                    <article>
                      <header>
                        <p className="history-event-kicker">
                          <time dateTime={observation.effective_date}>
                            {partialDateLabel(observation.effective_date)}
                          </time>
                          <span
                            className="history-valuation-badge"
                            data-tier={tier}
                          >
                            {mechanismLabel[observation.mechanism]}
                          </span>
                          <span className="history-valuation-basis-badge">
                            {basisLabel[observation.valuation.basis]}
                          </span>
                          {observation.confidence === "confirmed" ? null : (
                            <span className="history-event-confidence">
                              {observation.confidence}
                            </span>
                          )}
                        </p>
                        <h3>{observation.title}</h3>
                      </header>
                      <dl className="history-event-facts">
                        <div>
                          <dt>valuation</dt>
                          <dd>{observation.valuation.display}</dd>
                        </div>
                        <div>
                          <dt>measurement</dt>
                          <dd>{basisLabel[observation.valuation.basis]}</dd>
                        </div>
                        <div>
                          <dt>transaction status</dt>
                          <dd>{statusLabel[observation.status]}</dd>
                        </div>
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
                        {observation.share_price === undefined ? null : (
                          <div>
                            <dt>share price</dt>
                            <dd>{observation.share_price.display}</dd>
                          </div>
                        )}
                        {observation.financing_amount === undefined ? null : (
                          <div>
                            <dt>financing amount</dt>
                            <dd>
                              {observation.financing_amount.display}
                              {` · ${financingStageLabel[observation.financing_amount.stage]}`}
                            </dd>
                          </div>
                        )}
                        {observation.capital_transacted === undefined ? null : (
                          <div>
                            <dt>transaction</dt>
                            <dd>{observation.capital_transacted.display}</dd>
                          </div>
                        )}
                      </dl>
                      {observation.notes === undefined ? null : (
                        <p className="history-valuation-note">{observation.notes}</p>
                      )}
                      {observation.derivation === undefined ? null : (
                        <p className="history-valuation-note">
                          Derived as {observation.derivation.formula}.
                        </p>
                      )}
                      <p className="history-event-sources">
                        {observation.sources.map((source, index) => (
                          <span key={source.id}>
                            {index === 0 ? null : <span aria-hidden="true"> · </span>}
                            <a
                              aria-label={`${source.publisher}: ${source.title}`}
                              data-analytics-event="source link opened"
                              data-analytics-id={observation.id}
                              data-analytics-kind="valuation"
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
            aria-labelledby="valuation-method-heading"
            className="history-volume-method"
          >
            <h2 id="valuation-method-heading">method</h2>
            <p>
              Each row is a discrete observation, not an interpolated annual
              estimate. The compact chart selects one point per year by a fixed
              evidence order: financing or tender with signed, confirmed, or
              completed terms; internal 409A mark; completed investor
              secondary; then reported or unfinalized financing and market
              indications. Within the same tier, transaction status,
              confidence, source authority, and stated rather than inferred
              values rank before observation date. Missing years stay missing,
              and the chart never carries a prior value forward.
            </p>
            <p>
              Pre-money, post-money, transaction-implied, common-stock 409A,
              and market-indication values remain labeled separately. Approximate
              and inferred figures preserve their qualifiers. The bars use a
              linear scale from zero to the largest selected value; labels show
              the sourced nominal values.
            </p>
          </section>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
