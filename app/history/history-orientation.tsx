import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";

import { formatReviewDate } from "../evidence-snapshot";

export const historyEyebrow = "Independent · source-linked · reverse chronological";
export const historyHeadline = "Stripe’s history, dated and sourced";

export function historyLead(eventCount: number): string {
  return `${eventCount} dated events across products, funding, leadership, expansion, and scale, each linked to the source that reported it. Filter the timeline by category or compare the annual charts.`;
}

export const reviewStateNote =
  "Review state is the latest completed structured research-ledger run. It does not claim that every timeline category was re-reviewed on that date.";

/**
 * The root timeline hero and evidence stat strip on the design-kit marketing
 * grammar. The markup follows the documented `hraness-marketing-hero` and
 * `hraness-marketing-stats` classes directly so the actions stay on
 * `next/link`, the footnote can carry a link, and the review date keeps its
 * `<time>` element. Every number is computed from the loaded records.
 */
export function HistoryOrientation({
  evidence,
}: Readonly<{ evidence: HistoryEvidenceSummary }>) {
  const reviewDate = evidence.latestCompletedResearchRunOn;

  return (
    <>
      <header
        aria-labelledby="history-heading"
        className="hraness-marketing-hero history-orientation"
        data-align="center"
        data-hraness-marketing="hero"
        data-tone="paper"
      >
        <div className="hraness-marketing-hero__copy">
          <p className="hraness-marketing-hero__eyebrow">{historyEyebrow}</p>
          <p className="hraness-marketing-hero__name">Stripe History</p>
          <h1 className="hraness-marketing-hero__heading" id="history-heading">
            {historyHeadline}
          </h1>
          <p className="hraness-marketing-hero__summary">
            {historyLead(evidence.eventCount)}
          </p>
          <div className="hraness-marketing-hero__actions">
            <Link
              className="hraness-marketing-action"
              data-emphasis="primary"
              href="/about#sources-and-review"
            >
              Method and limits
            </Link>
            <Link
              className="hraness-marketing-action"
              data-emphasis="secondary"
              href="/data"
            >
              Export YAML
            </Link>
          </div>
          <p className="hraness-marketing-hero__boundary">
            Not affiliated with, endorsed by, or operated by Stripe, Inc.{" "}
            <Link href="/contact#corrections-and-sources">Report a correction</Link>.
          </p>
        </div>
      </header>
      <section
        aria-label="Current evidence snapshot"
        className="hraness-marketing-stats stripe-history-evidence-strip"
        data-hraness-marketing="stats"
      >
        <dl
          className="hraness-marketing-stats__list"
          style={{ "--hraness-marketing-fact-columns": "4" } as Record<string, string>}
        >
          <div>
            <dt>Timeline entries</dt>
            <dd><strong>{evidence.eventCount}</strong></dd>
          </div>
          <div>
            <dt>Entry source links</dt>
            <dd><strong>{evidence.sourceLinkCount}</strong></dd>
          </div>
          <div>
            <dt>Canonical sources</dt>
            <dd><strong>{evidence.canonicalSourceCount}</strong></dd>
          </div>
          <div>
            <dt>Review state</dt>
            <dd>
              <strong>
                {reviewDate === undefined
                  ? "not recorded"
                  : <time dateTime={reviewDate}>{formatReviewDate(reviewDate)}</time>}
              </strong>
            </dd>
          </div>
        </dl>
        <p className="hraness-marketing-stats__source">{reviewStateNote}</p>
      </section>
    </>
  );
}
