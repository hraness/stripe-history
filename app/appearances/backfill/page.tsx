import {
  loadAppearanceBackfill,
  type AppearanceBackfill,
} from "@/lib/appearance-backfill";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "../../site-footer";
import { SiteHeader } from "../../site-header";
import { site, socialMetadata } from "../../site";

const title = "Leadership Appearance Backfill";
const description =
  "A public review queue of historical Stripe founder and executive podcast, interview, talk, and testimony candidates discovered through bounded Exa search.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/appearances/backfill" },
  robots: { follow: true, index: false },
  ...socialMetadata(`${title} | ${site.domain}`, description, "/appearances/backfill"),
};

export default async function AppearanceBackfillPage() {
  const backfill = await loadAppearanceBackfill();
  const candidatesByYear = new Map<
    string,
    AppearanceBackfill["candidates"][number][]
  >();
  for (const candidate of backfill.candidates) {
    const year = candidate.published_at.slice(0, 4);
    const candidates = candidatesByYear.get(year) ?? [];
    candidates.push(candidate);
    candidatesByYear.set(year, candidates);
  }

  return (
    <main className="plain-page stripe-history-main stripe-history-appearances-page" id="main-content">
      <SiteHeader appearancesSelected />
      <nav aria-label="Breadcrumb" className="stripe-history-breadcrumbs">
        <Link href="/">history</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/appearances">appearances</Link>
        <span aria-hidden="true"> / </span>
        <span>backfill</span>
      </nav>
      <section aria-labelledby="appearance-backfill-heading" className="stripe-history-section">
        <div className="stripe-history-section-heading">
          <h1 id="appearance-backfill-heading">{title}</h1>
          <span>{backfill.candidates.length} candidates</span>
        </div>
        <div className="stripe-history-backfill-intro">
          <p>{description}</p>
          <p>
            These links are discovery results, not accepted historical records.
            Each one still needs canonical deduplication, complete source capture,
            role verification, and transcript-grounded editorial review before it
            can join the <Link href="/appearances">reviewed appearances</Link>.
          </p>
          <p>
            The <a href={backfill.workflow_run}>successful backfill run</a> searched
            {" "}{backfill.review_window.from.slice(0, 4)} through{" "}
            {backfill.review_window.through.slice(0, 4)} and returned{" "}
            {backfill.counts.raw_hits} raw hits. Review collapsed{" "}
            {backfill.counts.duplicate_variants} duplicate source variants, matched{" "}
            {backfill.counts.already_reviewed_variants} variants to existing records,
            and excluded {backfill.counts.excluded_hits} unrelated hits.
          </p>
        </div>
        <div className="stripe-history-backfill-years">
          {[...candidatesByYear.entries()].map(([year, candidates]) => (
            <section aria-labelledby={`backfill-${year}`} key={year}>
              <div className="stripe-history-section-heading">
                <h2 id={`backfill-${year}`}>{year}</h2>
                <span>{candidates.length}</span>
              </div>
              <ol className="stripe-history-backfill-list">
                {candidates.map((candidate) => (
                  <li key={candidate.url}>
                    <article>
                      <p className="stripe-history-appearance-kicker">
                        <time dateTime={candidate.published_at}>{candidate.published_at}</time>
                        <span>source review needed</span>
                      </p>
                      <h3><a href={candidate.url}>{candidate.title}</a></h3>
                      <p className="stripe-history-appearance-participants">
                        {candidate.participants.join(" · ")}
                      </p>
                      <p className="stripe-history-backfill-source">
                        {new URL(candidate.url).hostname}
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
