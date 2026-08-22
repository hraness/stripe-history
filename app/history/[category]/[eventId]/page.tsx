import { loadHistory, type HistoryCollection } from "@/lib/content";
import {
  timelineCategoryIds,
  type TimelineCategoryId,
} from "@/lib/history-schema";
import { historyCategoryPath, historyEventPath } from "@/lib/history-urls";
import { INDEXABLE_ROBOTS } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { independenceSentence } from "../../../site-copy";
import { breadcrumbJsonLd, historyEventJsonLd } from "../../../seo";
import { SiteFooter } from "../../../site-footer";
import { SiteHeader } from "../../../site-header";
import { site, socialMetadata } from "../../../site";
import { historyFilterVisualStyle } from "../../category-visuals";
import { HistoryEventArticle } from "../../history-event-article";

interface HistoryEventPageProps {
  readonly params: Promise<{ category: string; eventId: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const history = await loadHistory();
  return history.events
    .filter(({ categoryId }) => timelineCategoryIds.includes(categoryId))
    .map((event) => ({
      category: event.categoryId,
      eventId: event.id,
    }));
}

function resolveEvent(
  history: HistoryCollection,
  categoryId: string,
  eventId: string,
) {
  if (!timelineCategoryIds.includes(categoryId as TimelineCategoryId)) {
    return undefined;
  }
  return history.events.find((event) => (
    event.categoryId === categoryId && event.id === eventId
  ));
}

export async function generateMetadata({
  params,
}: HistoryEventPageProps): Promise<Metadata> {
  const { category, eventId } = await params;
  const history = await loadHistory();
  const event = resolveEvent(history, category, eventId);
  if (event === undefined) return {};
  const path = historyEventPath(event.categoryId, event.id);
  return {
    title: event.title,
    description: event.summary,
    alternates: { canonical: path },
    robots: INDEXABLE_ROBOTS,
    ...socialMetadata(`${event.title} | ${site.domain}`, event.summary, path),
  };
}

export default async function HistoryEventPage({
  params,
}: HistoryEventPageProps) {
  const { category, eventId } = await params;
  const history = await loadHistory();
  const event = resolveEvent(history, category, eventId);
  if (event === undefined) notFound();
  const path = historyEventPath(event.categoryId, event.id);
  const categoryPath = historyCategoryPath(event.categoryId);
  const relatedEvents = (event.related_events ?? []).flatMap((relatedId) => {
    const related = history.events.find(({ id }) => id === relatedId);
    return related === undefined ? [] : [related];
  });

  return (
    <>
      <JsonLdScript
        data={[
          historyEventJsonLd(event),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: event.categoryLabel, path: categoryPath },
            { name: event.title, path },
          ]),
        ]}
        id="stripedex-history-event-structured-data"
      />
      <main
        className="plain-page stripedex-main history-event-page"
        id="main-content"
      >
        <SiteHeader />
        <nav aria-label="Breadcrumb" className="stripedex-breadcrumbs">
          <Link href="/">history</Link>
          <span aria-hidden="true"> / </span>
          <Link href={categoryPath}>
            {event.categoryLabel.toLocaleLowerCase("en-US")}
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{event.date}</span>
        </nav>
        <section
          aria-labelledby={event.id}
          className="stripedex-section"
        >
          <div
            className="history-event"
            data-category={event.categoryId}
            style={historyFilterVisualStyle(event.categoryId)}
          >
            <HistoryEventArticle
              event={event}
              headingLevel="h1"
              linkedTitle={false}
            />
          </div>
          {relatedEvents.length === 0 ? null : (
            <section
              aria-labelledby="related-events-heading"
              className="history-related"
            >
              <h2 id="related-events-heading">Related events</h2>
              <ul>
                {relatedEvents.map((related) => (
                  <li key={related.id}>
                    <Link href={historyEventPath(related.categoryId, related.id)}>
                      {related.title}
                    </Link>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={related.date}>{related.date}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="history-independence">{independenceSentence}</p>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
