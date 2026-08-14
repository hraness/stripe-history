import { loadHistory } from "@/lib/content";
import { JsonLdScript } from "@/support/json-ld";
import type { Metadata } from "next";

import { breadcrumbJsonLd, historyCollectionJsonLd } from "../../seo";
import { site, socialMetadata } from "../../site";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import { HistoryFilters } from "../history-view";

export const dynamic = "force-static";

const paymentVolumeTitle = "Stripe Payment and Total Volume by Year";
const paymentVolumeSocialTitle = `${paymentVolumeTitle} | ${site.domain}`;
const paymentVolumeDescription =
  "Stripe annual volume history: payment volume from 2021 through 2024 and total volume for 2025, with source-linked disclosures from $640 billion+ to $1.9 trillion.";

export const metadata: Metadata = {
  title: paymentVolumeTitle,
  description: paymentVolumeDescription,
  alternates: { canonical: "/history/payment-volume" },
  ...socialMetadata(
    paymentVolumeSocialTitle,
    paymentVolumeDescription,
    "/history/payment-volume",
  ),
};

export default async function PaymentVolumePage() {
  const history = await loadHistory();
  const records = history.annualVolumes.flatMap((point) => {
    const event = history.events.find(({ id }) => id === point.eventId);
    return event === undefined ? [] : [{ event, point }];
  });
  const maximumValue = Math.max(...records.map(({ point }) => point.valueUsd));
  const valuesStrictlyIncrease = records.every(
    ({ point }, index) => index === 0
      || point.valueUsd > (records[index - 1]?.point.valueUsd ?? point.valueUsd),
  );

  return (
    <>
      <JsonLdScript
        data={[
          historyCollectionJsonLd(
            records.map(({ event, point }) => ({
              id: event.id,
              title: `${point.calendarYear}: ${point.display} ${point.kind === "total-volume" ? "total volume" : "payment volume"}`,
            })),
            {
              description: paymentVolumeDescription,
              path: "/history/payment-volume",
              title: paymentVolumeTitle,
            },
          ),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Annual volume", path: "/history/payment-volume" },
          ]),
        ]}
        id="stripe-guide-payment-volume-structured-data"
      />
      <main
        className="plain-page stripe-guide-main stripe-guide-history-main"
        id="main-content"
      >
        <SiteHeader />
        <section
          aria-labelledby="payment-volume-heading"
          className="stripe-guide-section history-volume-page"
        >
        <h1 className="stripe-history-visually-hidden" id="payment-volume-heading">
          {paymentVolumeTitle}
        </h1>
        <HistoryFilters history={history} paymentVolumeSelected />
        <p className="history-volume-intro">
          Stripe reported annual payment volume from 2021 through 2024 and
          switched to “total volume” for its 2025 figure.
          {valuesStrictlyIncrease
            ? " The disclosed values increase across every year in this series."
            : " The chart preserves each disclosed value without inferring a growth trend."}
          {" "}Each observation links to Stripe’s annual disclosure and its place
          in the company timeline.
        </p>

        <figure aria-labelledby="payment-volume-chart-heading" className="history-volume-chart">
          <figcaption>
            <h2 id="payment-volume-chart-heading">annual volume</h2>
            <p>Calendar year, nominal USD. Bars are scaled to the largest disclosure.</p>
          </figcaption>
          <ol role="list">
            {records.map(({ point }) => (
              <li key={point.calendarYear}>
                <a
                  href={`/history/${point.categoryId}#${point.eventId}`}
                >
                  <time dateTime={String(point.calendarYear)}>
                    {point.calendarYear}
                  </time>
                  <strong>{point.display}</strong>
                  <span>{point.kind === "total-volume" ? "total volume" : "payment volume"}</span>
                </a>
                <span aria-hidden="true" className="history-volume-chart-track">
                  <span
                    className="history-volume-chart-fill"
                    style={{ inlineSize: `${(point.valueUsd / maximumValue) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </figure>

        <section aria-labelledby="payment-volume-table-heading" className="history-volume-table-section">
          <h2 id="payment-volume-table-heading">disclosures and sources</h2>
          <div className="history-volume-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">year</th>
                  <th scope="col">volume</th>
                  <th scope="col">disclosed</th>
                  <th scope="col">sources</th>
                </tr>
              </thead>
              <tbody>
                {records.map(({ event, point }) => (
                  <tr id={event.id} key={event.id}>
                    <th scope="row">{point.calendarYear}</th>
                    <td>{point.display}</td>
                    <td><time dateTime={event.date}>{event.date}</time></td>
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

        <section aria-labelledby="payment-volume-method-heading" className="history-volume-method">
          <h2 id="payment-volume-method-heading">method</h2>
          <p>
            Years refer to the calendar year measured, not the later disclosure
            date. Values preserve Stripe’s published wording and qualifiers.
            The 2021 and 2022 figures are lower bounds, and Stripe calls the
            2025 figure “total volume.” Missing years are not inferred from
            rounded growth rates.
          </p>
        </section>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
