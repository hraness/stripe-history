import type { CategorizedHistoryEvent } from "@/lib/content";
import { loadSiteHistory } from "@/lib/site-history";
import { formatEventDate } from "@/lib/event-date";
import {
  confidenceNotes,
  datePrecisionNote,
  eventMetaDescription,
  historyEventNeighbors,
  historyEventPageTitle,
  historyEventPath,
} from "@/lib/event-page";
import { historyCategoryPath } from "@/lib/history-urls";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbJsonLd, historyEventJsonLd } from "../../seo";
import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import { HRANESS_URL, absoluteSiteUrl, site, socialMetadata } from "../../site";

interface HistoryEventPageProps {
  readonly params: Promise<{ id: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const history = await loadSiteHistory();
  return history.events.map(({ id }) => ({ id }));
}

async function resolveEvent(id: string) {
  const history = await loadSiteHistory();
  const neighbors = historyEventNeighbors(history, id);
  return neighbors === undefined ? undefined : { history, neighbors };
}

export async function generateMetadata({ params }: HistoryEventPageProps): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveEvent(id);
  if (resolved === undefined) return {};
  const { event } = resolved.neighbors;
  const path = historyEventPath(event.id);
  const title = historyEventPageTitle(event);
  const description = eventMetaDescription(event);
  const social = socialMetadata(title, description, path);
  return {
    title,
    description,
    alternates: { canonical: absoluteSiteUrl(path) },
    ...social,
    openGraph: {
      ...social.openGraph,
      type: "article",
      section: event.categoryLabel,
      ...(event.tags === undefined ? {} : { tags: [...event.tags] }),
    },
  };
}

function EventLink({ event }: Readonly<{ event: CategorizedHistoryEvent }>) {
  return (
    <>
      <Link href={historyEventPath(event.id)}>{event.title}</Link>
      {" "}
      <time className="stripe-history-event-page__muted" dateTime={event.date}>{formatEventDate(event.date)}</time>
    </>
  );
}

export default async function HistoryEventPage({ params }: HistoryEventPageProps) {
  const { id } = await params;
  const resolved = await resolveEvent(id);
  if (resolved === undefined) notFound();
  const { categoryEvents, event, newer, older, related } = resolved.neighbors;
  const path = historyEventPath(event.id);
  const categoryPath = historyCategoryPath(event.categoryId);
  const categoryName = event.categoryLabel.toLocaleLowerCase("en-US");
  const dateLabel = formatEventDate(event.date);

  return (
    <main className="plain-page stripe-history-main stripe-history-event-page" id="main-content">
      <JsonLdScript
        data={[
          historyEventJsonLd(event, eventMetaDescription(event)),
          breadcrumbJsonLd([
            { name: "Stripe History", path: "/" },
            { name: event.categoryLabel, path: categoryPath },
            { name: event.title, path },
          ]),
        ]}
        id="stripe-history-event-structured-data"
      />
      <SiteHeader askAiPath={path} />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">Stripe History</Link>
        <span aria-hidden="true"> / </span>
        <Link href={categoryPath}>{event.categoryLabel}</Link>
      </nav>
      <article aria-labelledby="event-heading" className="stripe-history-section stripe-history-event-page__article">
        <p className="stripe-history-event-page__kicker">
          <time dateTime={event.date}>{dateLabel}</time>
          {event.status === undefined ? null : (
            <>
              <span aria-hidden="true"> · </span>
              <span>{event.status}</span>
            </>
          )}
          {event.confidence === "confirmed" ? null : (
            <>
              <span aria-hidden="true"> · </span>
              <span>{event.confidence}</span>
            </>
          )}
        </p>
        <h1 id="event-heading">{event.title}</h1>
        <p className="stripe-history-event-page__answer">{event.summary}</p>

        <h2 id="facts">Facts</h2>
        <dl className="stripe-history-event-page__facts">
          <div>
            <dt>Date</dt>
            <dd><time dateTime={event.date}>{dateLabel}</time> ({datePrecisionNote(event.date_precision)})</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd><Link href={categoryPath}>{event.categoryLabel}</Link></dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{event.confidence}: {confidenceNotes[event.confidence]}</dd>
          </div>
          {event.status === undefined ? null : (
            <div>
              <dt>Status</dt>
              <dd>{event.status}</dd>
            </div>
          )}
          {event.amount === undefined ? null : (
            <div>
              <dt>Amount</dt>
              <dd>{event.amount.display}</dd>
            </div>
          )}
          {event.metrics?.map((metric) => (
            <div key={`metric-${metric.label}`}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}{metric.context === undefined ? null : ` · ${metric.context}`}</dd>
            </div>
          ))}
          {event.details?.map((detail) => (
            <div key={`detail-${detail.label}`}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
          {event.people === undefined ? null : (
            <div>
              <dt>People</dt>
              <dd>{event.people.join(", ")}</dd>
            </div>
          )}
          {event.organizations === undefined ? null : (
            <div>
              <dt>Organizations</dt>
              <dd>{event.organizations.join(", ")}</dd>
            </div>
          )}
          {event.locations === undefined ? null : (
            <div>
              <dt>Locations</dt>
              <dd>{event.locations.join(", ")}</dd>
            </div>
          )}
        </dl>

        <h2 id="sources">{event.sources.length === 1 ? "Source" : `Sources (${event.sources.length})`}</h2>
        <ol className="stripe-history-event-page__sources">
          {event.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url}>{source.title}</a>
              <span className="stripe-history-event-page__muted">
                {" "}{source.publisher} · {source.kind}
                {source.published_at === undefined ? null : ` · ${formatEventDate(source.published_at)}`}
              </span>
            </li>
          ))}
        </ol>

        <h2 id="more">More {categoryName} history</h2>
        {older === undefined && newer === undefined ? null : (
          <nav aria-label={`Earlier and later ${categoryName} events`} className="stripe-history-event-page__pager">
            {older === undefined ? <span /> : (
              <p>
                <span className="stripe-history-event-page__muted">Earlier</span>
                <br />
                <EventLink event={older} />
              </p>
            )}
            {newer === undefined ? null : (
              <p className="stripe-history-event-page__newer">
                <span className="stripe-history-event-page__muted">Later</span>
                <br />
                <EventLink event={newer} />
              </p>
            )}
          </nav>
        )}
        {related.length === 0 ? null : (
          <ul className="stripe-history-event-page__related">
            {related.map((candidate) => (
              <li key={candidate.id}><EventLink event={candidate} /></li>
            ))}
          </ul>
        )}
        <p>
          <Link href={categoryPath}>All {categoryEvents.length} {categoryName} events</Link>
          {" · "}
          <Link href="/">the full timeline</Link>
          {" · "}
          <Link href="/contact#corrections-and-sources">report a correction</Link>
        </p>
        <p className="stripe-history-event-page__muted">
          {site.name} is published by <a href={HRANESS_URL}>Hraness</a>.
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
