import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { orientationStyles as styles } from "./history-orientation.stylex";

import { formatReviewDate } from "../evidence-snapshot";

export const historyHeadline = "Stripe’s history, dated and sourced";

export function historyLead(eventCount: number): string {
  return `${eventCount} dated events across products, funding, leadership, expansion, and scale, each linked to the source that reported it. Filter the timeline by category or compare the annual charts.`;
}

export const reviewStateNote =
  "Review state is the latest completed structured research-ledger run. It does not claim that every timeline category was re-reviewed on that date.";

/**
 * The root introduction and native source disclosure on the design-kit marketing
 * grammar. Product-owned compiled slots retain next/link, a rich correction
 * footnote and semantic <time>; the released shared component's string-only
 * value props cannot express those contracts. Numbers still come from records.
 */
export function HistoryOrientation({
  evidence,
}: Readonly<{ evidence: HistoryEvidenceSummary }>) {
  const reviewDate = evidence.latestCompletedResearchRunOn;

  return (
    <>
      <header
        aria-labelledby="history-heading"
        className={`hraness-marketing-hero history-orientation ${stylex.props(styles.hero).className}`}
        data-align="start"
        data-hraness-marketing="hero"
        data-tone="paper"
      >
        <div className={`hraness-marketing-hero__copy ${stylex.props(styles.hero__copy).className}`}>
          <h1 className={`hraness-marketing-hero__heading ${stylex.props(styles.hero__heading).className}`} id="history-heading">
            {historyHeadline}
          </h1>
          <p className={`hraness-marketing-hero__summary ${stylex.props(styles.hero__summary).className}`}>
            {historyLead(evidence.eventCount)}
          </p>
          <div className={`hraness-marketing-hero__actions ${stylex.props(styles.hero__actions).className}`}>
            <a
              className={`hraness-marketing-action ${stylex.props(styles.actionPrimary, styles.actionFocus).className}`}
              data-emphasis="primary"
              href="#timeline"
            >
              Browse the timeline
            </a>
            <Link
              className={`hraness-marketing-action ${stylex.props(styles.action, styles.actionFocus).className}`}
              data-emphasis="secondary"
              href="/data"
            >
              Download the data
            </Link>
          </div>
          <p className={`hraness-marketing-hero__boundary ${stylex.props(styles.hero__boundary).className}`}>
            Not affiliated with, endorsed by, or operated by Stripe, Inc.{" "}
            <Link href="/contact#corrections-and-sources">Report a correction</Link>.
          </p>
        </div>
      </header>
      <details className={`history-source-details ${stylex.props(styles.sourceDetails).className}`}>
        <summary {...stylex.props(styles.sourceSummary)}>Sources and review</summary>
        <section
          aria-label="Current evidence snapshot"
          className={`hraness-marketing-stats stripe-history-evidence-strip ${stylex.props(styles.stats).className}`}
          data-hraness-marketing="stats"
        >
          <dl
            className={`hraness-marketing-stats__list ${stylex.props(styles.stats__list, styles.factColumns4).className}`}
          >
            <div {...stylex.props(styles.facts__item)}>
              <dt {...stylex.props(styles.facts__label)}>Timeline entries</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.eventCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemLater)}>
              <dt {...stylex.props(styles.facts__label)}>Entry source links</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.sourceLinkCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemRowOdd)}>
              <dt {...stylex.props(styles.facts__label)}>Canonical sources</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.canonicalSourceCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemRow)}>
              <dt {...stylex.props(styles.facts__label)}>Review state</dt>
              <dd {...stylex.props(styles.facts__body)}>
                <strong {...stylex.props(styles.stats__value)}>
                  {reviewDate === undefined
                    ? "not recorded"
                    : <time dateTime={reviewDate}>{formatReviewDate(reviewDate)}</time>}
                </strong>
              </dd>
            </div>
          </dl>
          <p className={`hraness-marketing-stats__source ${stylex.props(styles.stats__source).className}`}>
            {reviewStateNote}{" "}<Link href="/about#sources-and-review">Method and limits</Link>.
          </p>
        </section>
      </details>
    </>
  );
}
