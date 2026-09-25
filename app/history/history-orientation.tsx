import type { HistoryEvidenceSummary } from "@/lib/content";
import Link from "next/link";
import * as stylex from "@stylexjs/stylex";
import { orientationStyles as styles } from "./history-orientation.stylex";

import { formatReviewDate } from "../evidence-snapshot";
import { site } from "../site";
import { recordKeepingLabels, recordKeepingNote } from "../site-copy";

function formatEventDate(value: string): string {
  // Event dates keep source precision: a bare year or year-month stays verbatim.
  return value.length === 10 ? formatReviewDate(value) : value;
}

/**
 * The root introduction and native source disclosure on the design-kit marketing
 * grammar. Product-owned compiled slots retain next/link, a rich correction
 * footnote and semantic <time>; the released shared component's string-only
 * value props cannot express those contracts. Numbers still come from records.
 */
export function HistoryOrientation({
  evidence,
}: Readonly<{ evidence: HistoryEvidenceSummary }>) {
  const newestEventOn = evidence.newestEventOn;

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
          <p className={`hraness-marketing-hero__eyebrow ${stylex.props(styles.hero__eyebrow).className}`}>
            {site.category}
          </p>
          <h1 className={`hraness-marketing-hero__heading ${stylex.props(styles.hero__heading).className}`} id="history-heading">
            {site.tagline}
          </h1>
          <p className={`hraness-marketing-hero__summary ${stylex.props(styles.hero__summary).className}`}>
            {site.heroSummary}
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
        <summary {...stylex.props(styles.sourceSummary)}>How this record is kept</summary>
        <section
          aria-label="How this record is kept"
          className={`hraness-marketing-stats stripe-history-evidence-strip ${stylex.props(styles.stats).className}`}
          data-hraness-marketing="stats"
        >
          <p className={`hraness-marketing-stats__source ${stylex.props(styles.stats__source).className}`}>
            {recordKeepingNote}
          </p>
          <dl
            className={`hraness-marketing-stats__list ${stylex.props(styles.stats__list, styles.factColumns4).className}`}
          >
            <div {...stylex.props(styles.facts__item)}>
              <dt {...stylex.props(styles.facts__label)}>{recordKeepingLabels.eventCount}</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.eventCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemLater)}>
              <dt {...stylex.props(styles.facts__label)}>{recordKeepingLabels.canonicalSourceCount}</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.canonicalSourceCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemRowOdd)}>
              <dt {...stylex.props(styles.facts__label)}>{recordKeepingLabels.sourceLinkCount}</dt>
              <dd {...stylex.props(styles.facts__body)}><strong {...stylex.props(styles.stats__value)}>{evidence.sourceLinkCount}</strong></dd>
            </div>
            <div {...stylex.props(styles.facts__itemRow)}>
              <dt {...stylex.props(styles.facts__label)}>{recordKeepingLabels.newestEventOn}</dt>
              <dd {...stylex.props(styles.facts__body)}>
                <strong {...stylex.props(styles.stats__value)}>
                  {newestEventOn === undefined
                    ? "not recorded"
                    : <time dateTime={newestEventOn}>{formatEventDate(newestEventOn)}</time>}
                </strong>
              </dd>
            </div>
          </dl>
          <p className={`hraness-marketing-stats__source ${stylex.props(styles.stats__source).className}`}>
            <Link href="/about#sources-and-review">Method and limits</Link>.
          </p>
        </section>
      </details>
    </>
  );
}
