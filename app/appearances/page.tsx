import { loadHistory } from "@/lib/content";
import { loadAppearanceBackfill } from "@/lib/appearance-backfill";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";
import type { Metadata } from "next";
import Link from "next/link";

import { appearanceCollectionJsonLd, breadcrumbJsonLd } from "../seo";
import { SiteFooter } from "../site-footer";
import { SiteHeader } from "../site-header";
import { site, socialMetadata } from "../site";

const title = "Stripe Leadership Appearances";
const description =
  "Reviewed podcasts, interviews, talks, and testimony from Stripe founders and senior leaders, with source-linked summaries and transcripts when available.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/appearances" },
  ...socialMetadata(`${title} | ${site.domain}`, description, "/appearances"),
};

function durationLabel(seconds: number | undefined): string | null {
  if (seconds === undefined) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours === 0 ? `${minutes} min` : `${hours} hr ${minutes} min`;
}

export default async function AppearancesPage() {
  const [history, backfill] = await Promise.all([
    loadHistory(),
    loadAppearanceBackfill(),
  ]);
  const sourceById = new Map(history.sources.map((source) => [source.id, source]));

  return (
    <main className="plain-page stripe-history-main stripe-history-appearances-page" id="main-content">
      <JsonLdScript
        data={[
          appearanceCollectionJsonLd(history),
          breadcrumbJsonLd([
            { name: "History", path: "/" },
            { name: "Appearances", path: "/appearances" },
          ]),
        ]}
        id="stripe-history-appearances-structured-data"
      />
      <SiteHeader appearancesSelected />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <span>appearances</span>
      </nav>
      <section aria-labelledby="appearances-heading" className="stripe-history-section">
        <div className="stripe-history-section-heading">
          <h1 id="appearances-heading">{title}</h1>
          <span>{history.appearances.length} reviewed</span>
        </div>
        <p className="stripe-history-appearances-intro">{description}</p>
        <p className="stripe-history-appearances-intro">
          <Link href="/appearances/backfill">
            Review {backfill.candidates.length} historical appearance candidates
          </Link>{" "}
          from the public 2009–2026 leadership backfill.
        </p>
        <ol className="stripe-history-appearance-list">
          {history.appearances.map((appearance) => {
            const sources = appearance.source_ids.flatMap((sourceId) => {
              const source = sourceById.get(sourceId);
              return source === undefined ? [] : [source];
            });
            const duration = durationLabel(appearance.duration_seconds);
            return (
              <li id={appearance.id} key={appearance.id}>
                <article>
                  <p className="stripe-history-appearance-kicker">
                    <time dateTime={appearance.occurred_at}>{appearance.occurred_at}</time>
                    <span>{appearance.venue}</span>
                    {duration === null ? null : <span>{duration}</span>}
                  </p>
                  <h2>{appearance.title}</h2>
                  <p className="stripe-history-appearance-participants">
                    {appearance.participants.map((participant) => (
                      <span key={participant.name}>
                        <strong>{participant.name}</strong>
                        {participant.stripe_role === undefined
                          ? null
                          : <> · {participant.stripe_role}</>}
                      </span>
                    ))}
                  </p>
                  <p>{appearance.digest?.gist ?? appearance.significance}</p>
                  {appearance.digest === undefined ? null : (
                    <ul className="stripe-history-appearance-ideas">
                      {appearance.digest.ideas.map((idea) => (
                        <li key={idea.title}>
                          <strong>{idea.title}.</strong> {idea.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="stripe-history-appearance-sources">
                    {sources.map((source, index) => (
                      <span key={source.id}>
                        {index === 0 ? null : " · "}
                        <a href={source.url}>{source.publisher}</a>
                      </span>
                    ))}
                    {appearance.transcript.availability === "none"
                      ? null
                      : ` · ${appearance.transcript.availability} transcript`}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </section>
      <SiteFooter />
    </main>
  );
}
